/* DailyWins — notification preferences + timezone, stored server-side.

   These live in Supabase rather than localStorage because the reminder sender
   (netlify/functions/evening-reminder.ts) has to read them. Device-scoped
   preferences (theme, display name) stay in the `dw_prefs` localStorage blob
   owned by WinsProvider. */

import { supabase } from './supabase';

export interface UserSettings {
  user_id: string;
  /** Opaque OneSignal External ID. Never written from the client — the column
      grant in the migration rejects it. */
  push_alias: string;
  push_enabled: boolean;
  evening_reminder_enabled: boolean;
  /** 'HH:MM:SS' as Postgres returns it. Always send 'HH:MM'. */
  reminder_local_time: string;
  timezone: string;
  weekly_digest_enabled: boolean;
}

export type UserSettingsPatch = Partial<
  Pick<
    UserSettings,
    | 'push_enabled'
    | 'evening_reminder_enabled'
    | 'reminder_local_time'
    | 'timezone'
    | 'weekly_digest_enabled'
  >
>;

const COLUMNS =
  'user_id, push_alias, push_enabled, evening_reminder_enabled, reminder_local_time, timezone, weekly_digest_enabled';

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The reminder_local_time CHECK constraint only accepts quarter hours, and
    browsers still accept arbitrary typed values despite <input step>. */
export function roundToQuarterHour(hhmm: string): string {
  const [rawH, rawM] = hhmm.split(':');
  const h = Number(rawH);
  const m = Number(rawM);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '20:00';
  const total = Math.round((h * 60 + m) / 15) * 15;
  // Rounding 23:53 up lands on 24:00 — wrap to midnight rather than emit an
  // hour Postgres will reject.
  const wrapped = total % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** 'HH:MM:SS' or 'HH:MM' → a friendly '8:00 PM'. */
export function formatReminderTime(value: string): string {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const ap = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
}

/** 'HH:MM:SS' → 'HH:MM' for <input type="time">. */
export function toInputTime(value: string): string {
  return value.slice(0, 5);
}

/** Reads the row, creating it with defaults on first call. Rows are created
    lazily here rather than from the auth.users signup trigger: that trigger is
    AFTER INSERT, so anything that throws inside it fails the signup itself. */
export async function ensureUserSettings(userId: string): Promise<UserSettings | null> {
  const existing = await supabase.from('user_settings').select(COLUMNS).eq('user_id', userId).maybeSingle();
  if (existing.error) {
    console.error('Error loading user settings:', existing.error);
    return null;
  }
  if (existing.data) return existing.data as unknown as UserSettings;

  const created = await supabase
    .from('user_settings')
    .insert({ user_id: userId, timezone: browserTimezone() })
    .select(COLUMNS)
    .single();
  if (!created.error) return created.data as unknown as UserSettings;

  // 23505: another tab/device won the race — just read what it wrote.
  if (created.error.code === '23505') {
    const retry = await supabase.from('user_settings').select(COLUMNS).eq('user_id', userId).maybeSingle();
    if (!retry.error && retry.data) return retry.data as unknown as UserSettings;
  }
  console.error('Error creating user settings:', created.error);
  return null;
}

export async function updateUserSettings(
  userId: string,
  patch: UserSettingsPatch
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .update(patch)
    .eq('user_id', userId)
    .select(COLUMNS)
    .single();
  if (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
  return data as unknown as UserSettings;
}
