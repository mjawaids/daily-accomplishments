/* DailyWins — daily "log a win" push reminder.

   Runs every 15 minutes (UTC). Each run asks Postgres which users are due right
   now in their own local time, atomically claiming a notification_log row for
   each so a repeated or overlapping run cannot double-send, then hands the
   resulting push aliases to OneSignal.

   All of the timezone reasoning lives in the claim RPC (see
   supabase/migrations/20250918000000_push_reminders.sql) — this file only has to
   move the results to OneSignal and record what happened.

   Scheduled functions cannot be invoked over public HTTP, so there is no
   endpoint to authenticate or abuse. Trigger manually with the "Run now" button
   in the Netlify UI, or `netlify functions:invoke evening-reminder` locally. */

import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export const config: Config = { schedule: '*/15 * * * *' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
// Netlify sets URL to the project's primary URL at runtime; the fallback is
// only for local invokes.
const SITE_URL = process.env.URL || 'https://dailywins.ibexoft.com';

/** Netlify's hard cap is 30s. Stop starting new work with headroom to spare —
    anything left claimed is released and picked up by the next run, which is
    still inside the RPC's grace window. */
const DEADLINE_MS = 22_000;
/** OneSignal accepts more per request; 500 keeps each POST fast and makes a
    partial failure granular. */
const CHUNK_SIZE = 500;

interface DueRow {
  log_id: number;
  push_alias: string;
  local_date: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default async (): Promise<Response> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    // A non-2xx marks the run failed in the Netlify UI, which is what we want
    // for a misconfiguration — it should be loud, not silent.
    console.error('[evening-reminder] missing required environment variables');
    return new Response(JSON.stringify({ error: 'Missing environment configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deadline = Date.now() + DEADLINE_MS;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('claim_due_evening_reminders', {
    p_grace_minutes: 90,
    p_limit: 1500,
  });

  if (error) {
    // Nothing was claimed, so the next run retries the same users.
    console.error('[evening-reminder] claim RPC failed:', error);
    return new Response(JSON.stringify({ error: 'Claim failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const due = (data || []) as DueRow[];
  let sent = 0;
  let failed = 0;
  let ambiguous = 0;
  const unsent: number[] = [];

  const batches = chunk(due, CHUNK_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const logIds = batch.map((r) => r.log_id);

    if (Date.now() > deadline) {
      // Never POSTed — definitely not delivered, so it is safe to release.
      // Worth shouting about: it means one run can no longer drain the queue.
      console.error(
        '[evening-reminder] out of time, releasing unsent batch',
        describe(logIds, `${batches.length - i} of ${batches.length} batches left`)
      );
      unsent.push(...logIds);
      continue;
    }

    const outcome = await sendChunk(
      batch.map((r) => r.push_alias),
      deadline
    );

    if (outcome.kind === 'sent') {
      const { error: writeError } = await supabase
        .from('notification_log')
        .update({ status: 'sent', onesignal_id: outcome.id, sent_at: new Date().toISOString() })
        .in('id', logIds);
      // This is the write that matters most. If it fails the row stays
      // 'claimed', and the UNIQUE (user_id, kind, local_date) index then blocks
      // the re-claim tomorrow as well — one lost write, two missed reminders.
      if (writeError) logWriteFailure('sent', logIds, writeError);
      sent += batch.length;
    } else if (outcome.kind === 'failed') {
      // A definite rejection: it will fail identically next run, so record it
      // and leave the row in place rather than retrying forever.
      console.error('[evening-reminder] send rejected', describe(logIds, outcome.error));
      const { error: writeError } = await supabase
        .from('notification_log')
        .update({ status: 'failed', error: outcome.error.slice(0, 500) })
        .in('id', logIds);
      if (writeError) logWriteFailure('failed', logIds, writeError);
      failed += batch.length;
    } else if (outcome.kind === 'not-sent') {
      // Provably never left this process.
      console.error('[evening-reminder] not sent, releasing', describe(logIds, outcome.error));
      unsent.push(...logIds);
    } else {
      // Ambiguous: a timeout or 5xx where the request may well have been
      // delivered. Leaving the row claimed risks a missed reminder; releasing it
      // risks a duplicate 8pm push. A missed nudge is an annoyance, a duplicate
      // is a reason to uninstall — so we leave it claimed.
      console.error('[evening-reminder] ambiguous, left claimed', describe(logIds, outcome.error));
      const { error: writeError } = await supabase
        .from('notification_log')
        .update({ error: outcome.error.slice(0, 500) })
        .in('id', logIds);
      if (writeError) logWriteFailure('ambiguous', logIds, writeError);
      ambiguous += batch.length;
    }
  }

  if (unsent.length) {
    const { error: releaseError } = await supabase.rpc('release_notification_claims', {
      p_ids: unsent,
    });
    if (releaseError) console.error('[evening-reminder] release failed:', releaseError);
  }

  await sweepOldLogs(supabase);

  const summary = { claimed: due.length, sent, failed, ambiguous, released: unsent.length };
  console.log('[evening-reminder]', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** Netlify's log is the only place anyone looks first, so every non-success
    outcome has to name itself there. The reason used to go to Postgres alone,
    which made a total delivery failure indistinguishable from a quiet night.
    Aliases are deliberately never logged — log ids are enough to find the row. */
function describe(logIds: number[], reason: string): string {
  return JSON.stringify({
    count: logIds.length,
    logIds: logIds.slice(0, 20),
    reason,
  });
}

/** The send already happened (or provably did not) by the time we record it;
    losing this write only loses the record, so log it and keep going. */
function logWriteFailure(outcome: string, logIds: number[], error: PostgrestError): void {
  console.error(
    `[evening-reminder] could not record '${outcome}' outcome`,
    describe(logIds, error.message)
  );
}

type SendOutcome =
  | { kind: 'sent'; id: string | null }
  | { kind: 'failed'; error: string }
  | { kind: 'not-sent'; error: string }
  | { kind: 'ambiguous'; error: string };

async function sendChunk(aliases: string[], deadline: number): Promise<SendOutcome> {
  // Reused across retries of THIS chunk so a retry after an ambiguous failure
  // cannot produce a second notification. Cross-run dedupe is the ledger's job;
  // a per-user key is impossible when one request carries many users.
  const idempotencyKey = crypto.randomUUID();

  const body = JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    target_channel: 'push',
    include_aliases: { external_id: aliases },
    headings: { en: 'Daily Wins' },
    // Deliberately generic: notification bodies render on lock screens, and the
    // Web SDK has no Identity Verification, so the payload must never carry
    // anything personal (no win text, counts, names or streaks).
    contents: { en: 'Take 20 seconds — what went well today?' },
    url: SITE_URL,
    data: { kind: 'evening_reminder' },
    // Replaces a stale reminder rather than stacking a second one.
    web_push_topic: 'evening_reminder',
    idempotency_key: idempotencyKey,
    // NB: do not add `throttle_rate_per_minute` here. Throttling is a Growth+
    // entitlement, and a free-plan app is rejected with
    // 400 {"errors":["This app is not entitled to use throttling"]} for sending
    // the field at all — including the value 0. Omitting it applies the app
    // default, which is what we want anyway.
  });

  let lastError = 'unknown';

  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() > deadline) return { kind: 'not-sent', error: 'deadline reached before send' };

    let res: Response;
    try {
      res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(8_000),
      });
    } catch (err) {
      // The request may or may not have reached OneSignal.
      lastError = `network: ${err instanceof Error ? err.message : String(err)}`;
      if (Date.now() > deadline) return { kind: 'ambiguous', error: lastError };
      await sleep(backoff(attempt));
      continue;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After')) || 0;
      const wait = Math.max(retryAfter * 1000, backoff(attempt));
      lastError = `rate limited (429), retry-after ${retryAfter}s`;
      if (Date.now() + wait + 1_000 > deadline) return { kind: 'not-sent', error: lastError };
      await sleep(wait * (1 + Math.random() * 0.3));
      continue;
    }

    if (res.status >= 500) {
      lastError = `server error ${res.status}`;
      if (Date.now() > deadline) return { kind: 'ambiguous', error: lastError };
      await sleep(backoff(attempt));
      continue;
    }

    const payload = (await res.json().catch(() => ({}))) as {
      id?: string;
      errors?: unknown;
    };

    if (res.ok && payload.id) return { kind: 'sent', id: payload.id };

    if (res.ok) {
      // 2xx with errors and no id — e.g. "All included players are not
      // subscribed". Not retryable.
      return { kind: 'failed', error: `no notification created: ${JSON.stringify(payload.errors)}` };
    }

    // Any other 4xx: definitely not sent, and identical next time.
    return { kind: 'failed', error: `http ${res.status}: ${JSON.stringify(payload)}` };
  }

  return { kind: 'ambiguous', error: lastError };
}

function backoff(attempt: number): number {
  return Math.min(2_000 * 2 ** attempt, 8_000);
}

/** Keeps the ledger from growing without bound. Guarded so it runs about once a
    day rather than on all 96 daily invocations. */
async function sweepOldLogs(supabase: SupabaseClient): Promise<void> {
  const now = new Date();
  if (now.getUTCHours() !== 3 || now.getUTCMinutes() >= 15) return;
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('notification_log').delete().lt('created_at', cutoff);
  if (error) console.error('[evening-reminder] retention sweep failed:', error);
}
