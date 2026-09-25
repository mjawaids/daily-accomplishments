/* Push reachability
   -----------------
   push_enabled is the user's account-wide choice. It says nothing about whether
   any device can still receive a push: permission gets revoked, site data gets
   cleared, the PWA gets uninstalled. When that happens to every device, OneSignal
   answers each send with "All included players are not subscribed" and the
   sender used to write a 'failed' notification_log row every night, forever.

   push_unreachable_since records OneSignal's server-side verdict that the account
   has no live push subscription. It suppresses sending WITHOUT touching
   push_enabled, deliberately:

     - Only the sender (service_role) sets it, and only on OneSignal's say-so.
       Subscription state is per-browser; a second browser that never opted in
       must not be able to switch reminders off for the phone that did, so the
       client can never set it.
     - Leaving push_enabled true keeps the self-healing path alive: the client
       still runs resubscribeIfPermitted() for a returning device, and once any
       device is subscribed again it clears this column via
       mark_push_reachable(). The user is never stranded.

   A device claiming to be subscribed can only turn sending back ON, which is
   harmless: if OneSignal disagrees, the next send re-marks it. */

alter table public.user_settings
  add column if not exists push_unreachable_since timestamptz;

-- Not added to the authenticated column grant on purpose (see above): the
-- client reads it for the Profile sub-line but can only clear it, and only
-- through mark_push_reachable().

/* Same function as the push_reminders migration, plus: toggling push_enabled
   either way is a fresh decision by the user, so it resets the verdict. */
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
  if tg_op = 'UPDATE' and new.push_enabled is distinct from old.push_enabled then
    new.push_unreachable_since := null;
  end if;
  return new;
end;
$$;

/* Unchanged from the push_reminders migration except for the
   `push_unreachable_since is null` filter in `candidates`. See that migration
   for why every other line is the way it is. */
create or replace function public.claim_due_evening_reminders(
  p_grace_minutes int default 90,
  p_limit         int default 1500
)
returns table (log_id bigint, push_alias uuid, local_date date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
  with candidates as (
    select
      us.user_id,
      l.local_now,
      case
        when l.local_now >= (l.local_now::date + us.reminder_local_time)
          then  l.local_now::date + us.reminder_local_time
        else   (l.local_now::date + us.reminder_local_time) - interval '1 day'
      end as last_due
    from public.user_settings us
    join pg_timezone_names z on z.name = us.timezone
    cross join lateral (select (now() at time zone us.timezone) as local_now) l
    where us.push_enabled
      and us.evening_reminder_enabled
      -- OneSignal has told us no device can receive it; don't claim a row that
      -- can only end up 'failed'. Cleared by mark_push_reachable().
      and us.push_unreachable_since is null
  ),
  due as (
    select c.user_id, c.last_due::date as local_date
    from candidates c
    where c.local_now - c.last_due < make_interval(mins => p_grace_minutes)
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
    on conflict (user_id, kind, local_date) do nothing
    returning notification_log.id, notification_log.user_id, notification_log.local_date
  )
  select cl.id, us.push_alias, cl.local_date
  from claimed cl
  join public.user_settings us on us.user_id = cl.user_id;
end;
$$;

-- CREATE OR REPLACE keeps existing privileges; restated so this file stands on
-- its own. Not optional -- see the push_reminders migration.
revoke all on function public.claim_due_evening_reminders(int,int)
  from public, anon, authenticated;
grant execute on function public.claim_due_evening_reminders(int,int) to service_role;

-- Sender only. Returns how many accounts were newly marked. Guarded on
-- push_enabled so a stale verdict can never land on an account that has since
-- turned push off (the trigger would clear it on the next toggle anyway).
create or replace function public.mark_push_unreachable(p_aliases uuid[])
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with marked as (
    update public.user_settings
       set push_unreachable_since = now()
     where push_alias = any(p_aliases)
       and push_enabled
       and push_unreachable_since is null
    returning 1
  )
  select count(*)::int from marked;
$$;

revoke all on function public.mark_push_unreachable(uuid[])
  from public, anon, authenticated;
grant execute on function public.mark_push_unreachable(uuid[]) to service_role;

-- Client: called by a browser that is subscribed right now. Can only clear, and
-- only the caller's own row.
create or replace function public.mark_push_reachable()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.user_settings
     set push_unreachable_since = null
   where user_id = auth.uid()
     and push_unreachable_since is not null;
$$;

revoke all on function public.mark_push_reachable() from public, anon;
grant execute on function public.mark_push_reachable() to authenticated;
