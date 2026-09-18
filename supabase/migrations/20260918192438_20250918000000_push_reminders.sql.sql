/* Push reminders (OneSignal)
   ---------------------------
   Adds the two tables and two RPCs behind the daily "log a win" push:

     user_settings    - per-user notification prefs + IANA timezone + an opaque
                        push_alias used as the OneSignal External ID.
     notification_log - the dedupe/audit ledger. The UNIQUE (user_id, kind,
                        local_date) constraint -- NOT the cron window -- is what
                        guarantees at most one reminder per user per local day.
                        Do not "optimise" it away.

   The sender is netlify/functions/evening-reminder.ts, on a 15-minute UTC cron. */

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- user_settings

create table if not exists public.user_settings (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  -- Opaque OneSignal External ID. Deliberately NOT auth.users.id: the Web SDK has
  -- no Identity Verification, so anyone can call OneSignal.login('<id>') from the
  -- console and start receiving that id's pushes. A random uuid readable only by
  -- its owner makes that 122 bits of guessing instead of "did a user id ever leak".
  push_alias               uuid not null default gen_random_uuid(),
  push_enabled             boolean not null default false,
  evening_reminder_enabled boolean not null default true,
  reminder_local_time      time not null default '20:00'
                             check (extract(minute from reminder_local_time)::int % 15 = 0
                                    and extract(second from reminder_local_time) = 0),
  timezone                 text not null default 'UTC',
  weekly_digest_enabled    boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists user_settings_push_alias_key
  on public.user_settings (push_alias);

alter table public.user_settings enable row level security;

drop policy if exists "Users can read their own settings" on public.user_settings;
create policy "Users can read their own settings"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy on purpose; rows die with the auth.users cascade.

-- Column-level grant: the client must never rewrite its own push_alias. RLS alone
-- would permit it, which would allow probing for alias collisions against the
-- unique index above.
revoke update on public.user_settings from authenticated;
grant update (push_enabled, evening_reminder_enabled, reminder_local_time,
              timezone, weekly_digest_enabled)
  on public.user_settings to authenticated;

/* Intl.DateTimeFormat().resolvedOptions().timeZone can return values Postgres
   rejects ('Etc/Unknown', or a zone newer than the server's tzdata). Since
   `now() AT TIME ZONE '<bad>'` raises, one such row would abort the claim query
   for EVERY user. Coerce rather than raise, so a client with an exotic zone can
   still save its other settings. */
create or replace function public.normalize_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.timezone is null
     or not exists (select 1 from pg_timezone_names z where z.name = new.timezone) then
    new.timezone := 'UTC';
  end if;
  return new;
end;
$$;

drop trigger if exists user_settings_normalize on public.user_settings;
create trigger user_settings_normalize
  before insert or update on public.user_settings
  for each row execute function public.normalize_user_settings();

-- ------------------------------------------------------------- notification_log

create table if not exists public.notification_log (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('evening_reminder','weekly_digest')),
  local_date   date not null,
  status       text not null default 'claimed' check (status in ('claimed','sent','failed')),
  onesignal_id text,
  error        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  unique (user_id, kind, local_date)
);

create index if not exists notification_log_created_at_idx
  on public.notification_log (created_at);

alter table public.notification_log enable row level security;

-- RLS with zero policies denies everything, but Supabase grants table privileges
-- to anon/authenticated by default -- revoke those and the sequence too.
revoke all on public.notification_log from anon, authenticated;
revoke all on sequence public.notification_log_id_seq from anon, authenticated;

-- ------------------------------------------------------------------- claim RPC

/* Returns the users whose reminder is due right now, having atomically claimed a
   ledger row for each so that a concurrent or repeated run sends nothing twice.

   p_grace_minutes is deliberately generous (90 by default). A tight window would
   look sufficient -- every current IANA offset is a whole multiple of 15 minutes,
   so a 15-minute UTC cron lands on quarter-hours in every zone -- but it breaks twice:

     1. DST spring-forward silently drops a day. Where the clock jumps 02:00->03:00,
        wall-clock 02:30 never exists: before the jump local_now=01:59 (delta ~23.5h),
        after it local_now=03:00 (delta 30min). Neither matches a 15-minute window.
        America/Santiago and America/Havana transition at local midnight, so
        late-night reminder times hit this for real.
     2. Netlify does not fire scheduled runs at exactly :00.000, and a failed run,
        a deploy, or a Supabase blip would otherwise cost a whole day.

   The grace window makes the system self-healing with no retry queue; the unique
   constraint still caps it at one send. Don't go below ~35 minutes (you lose the
   spring-forward fix) or above ~120 (nobody wants this push at 10pm). */
create or replace function public.claim_due_evening_reminders(
  p_grace_minutes int default 90,
  p_limit         int default 1500
)
returns table (log_id bigint, push_alias uuid, local_date date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- The RETURNS TABLE output parameters (log_id, push_alias, local_date) are also
-- PL/pgSQL variables, and they collide with the identically-named columns below.
-- An ON CONFLICT target cannot be table-qualified, so resolve in favour of the
-- column. Nothing here intends to read the output variables.
#variable_conflict use_column
begin
  return query
  with candidates as (
    select
      us.user_id,
      l.local_now,
      -- Anchor BACKWARDS from local_now to the most recent occurrence of the
      -- reminder time. This is what makes a 23:45 reminder work: at local 00:05
      -- the next day, today's 23:45 has not happened yet, so we correctly fall
      -- back to yesterday's -- and local_date follows the anchor, not the clock.
      case
        when l.local_now >= (l.local_now::date + us.reminder_local_time)
          then  l.local_now::date + us.reminder_local_time
        else   (l.local_now::date + us.reminder_local_time) - interval '1 day'
      end as last_due
    from public.user_settings us
    -- Defence in depth alongside the normalisation trigger: drop unresolvable
    -- zones rather than let AT TIME ZONE raise and abort the batch for everyone.
    join pg_timezone_names z on z.name = us.timezone
    -- NB: `timestamptz AT TIME ZONE tz` yields a `timestamp` (local wall clock).
    -- The inverse direction is a different operator; swapping them silently
    -- shifts everything by 2x the offset.
    cross join lateral (select (now() at time zone us.timezone) as local_now) l
    where us.push_enabled
      and us.evening_reminder_enabled
  ),
  due as (
    select c.user_id, c.last_due::date as local_date
    from candidates c
    where c.local_now - c.last_due < make_interval(mins => p_grace_minutes)
      -- This anti-join MUST come before the limit. Claiming a user does not
      -- remove them from `candidates` (which reads only user_settings), so
      -- without it the same first p_limit users are re-selected on every run,
      -- ON CONFLICT DO NOTHING returns nothing, and everyone past the cap is
      -- never served -- silently, and only once the product is popular enough
      -- to exceed p_limit in a single window.
      -- Served by the UNIQUE (user_id, kind, local_date) index.
      and not exists (
        select 1
        from public.notification_log nl
        where nl.user_id = c.user_id
          and nl.kind = 'evening_reminder'
          and nl.local_date = c.last_due::date
      )
    order by c.user_id
    limit p_limit
  ),
  claimed as (
    insert into public.notification_log (user_id, kind, local_date, status)
    select d.user_id, 'evening_reminder', d.local_date, 'claimed' from due d
    -- Guards only the race between the anti-join above and this insert; the
    -- steady-state filtering is the anti-join's job.
    on conflict (user_id, kind, local_date) do nothing
    returning notification_log.id, notification_log.user_id, notification_log.local_date
  )
  select cl.id, us.push_alias, cl.local_date
  from claimed cl
  join public.user_settings us on us.user_id = cl.user_id;
end;
$$;

/* Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes the whole
   public schema, so without these revokes any anonymous browser could POST
   /rest/v1/rpc/claim_due_evening_reminders and burn every user's daily claim,
   silently suppressing all reminders. These lines are not optional. */
revoke all on function public.claim_due_evening_reminders(int,int)
  from public, anon, authenticated;
grant execute on function public.claim_due_evening_reminders(int,int) to service_role;

-- Releases claims for sends that provably never left the building. The sender
-- must NOT call this for ambiguous outcomes (a POST that timed out is
-- indistinguishable from one that succeeded) -- a missed reminder is an
-- annoyance, a duplicate 8pm push is a reason to uninstall.
create or replace function public.release_notification_claims(p_ids bigint[])
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.notification_log where id = any(p_ids) and status = 'claimed';
$$;

revoke all on function public.release_notification_claims(bigint[])
  from public, anon, authenticated;
grant execute on function public.release_notification_claims(bigint[]) to service_role;