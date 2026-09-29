/* User-managed categories
   -----------------------
   Replaces the hardcoded work/personal/learning/health CHECK on
   accomplishments.category with a per-user `categories` table.

     categories                 - one row per user category. The four defaults
                                  carry a legacy_key so old text values map
                                  onto them.
     accomplishments.category_id - the win's category (NOT NULL, FK restrict:
                                  a category with wins can only be removed
                                  through delete_category(), which moves them).
     accomplishments.category   - kept, nullable, as a compatibility column.
                                  Stale PWA clients and offline ops queued in
                                  IndexedDB before this release still write it;
                                  the trigger below resolves it to a
                                  category_id. For new writes it mirrors the
                                  category's legacy_key (null for custom ones).

   Keep the color/icon lists in sync with src/lib/categories.ts
   (src/lib/categories.test.ts checks this). */

-- ------------------------------------------------------------------ categories

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 24),
  color      text not null check (color in ('blue','rose','violet','green','amber','teal','orange','slate')),
  icon       text not null check (icon in ('briefcase','heartHand','book','activity','star','target','flame',
                                           'spark','flag','home','user','calendar','chart','clock','mail','image')),
  position   integer not null default 0,
  legacy_key text check (legacy_key in ('work','personal','learning','health')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_key
  on public.categories (user_id, lower(btrim(name)));

-- Plain (non-expression) unique index so the client can upsert the defaults
-- with on_conflict=user_id,legacy_key. NULLs are distinct, so custom
-- categories never collide on it.
create unique index if not exists categories_user_legacy_key
  on public.categories (user_id, legacy_key);

alter table public.categories enable row level security;

drop policy if exists "Users can read their own categories" on public.categories;
create policy "Users can read their own categories"
  on public.categories for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own categories" on public.categories;
create policy "Users can insert their own categories"
  on public.categories for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own categories" on public.categories;
create policy "Users can update their own categories"
  on public.categories for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own categories" on public.categories;
create policy "Users can delete their own categories"
  on public.categories for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists update_categories_updated_at on public.categories;
create trigger update_categories_updated_at
  before update on public.categories
  for each row execute function update_updated_at_column();

-- Cap per user. Mirrors MAX_CATEGORIES in src/lib/categories.ts.
create or replace function public.enforce_category_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.categories where user_id = new.user_id) >= 20 then
    raise exception 'category limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists categories_limit on public.categories;
create trigger categories_limit
  before insert on public.categories
  for each row execute function public.enforce_category_limit();

-- Seeds the four defaults, but only for a user with no categories at all: a user
-- who deleted "Health" must not get it back.
create or replace function public.seed_default_categories(p_user uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.categories where user_id = p_user) then
    return;
  end if;
  insert into public.categories (user_id, name, color, icon, position, legacy_key)
  values (p_user, 'Work',     'blue',   'briefcase', 0, 'work'),
         (p_user, 'Personal', 'rose',   'heartHand', 1, 'personal'),
         (p_user, 'Learning', 'violet', 'book',      2, 'learning'),
         (p_user, 'Health',   'green',  'activity',  3, 'health')
  on conflict do nothing;
end;
$$;

-- The compat trigger below calls this with the caller's rights, so
-- authenticated keeps EXECUTE (RLS confines the inserts to its own rows).
revoke execute on function public.seed_default_categories(uuid) from public, anon;
grant execute on function public.seed_default_categories(uuid) to authenticated;

-- Backfill every existing account in one set-based statement. Accounts that
-- already have categories are skipped, so a re-run never restores a default
-- the user deleted.
insert into public.categories (user_id, name, color, icon, position, legacy_key)
select u.id, d.name, d.color, d.icon, d.position, d.legacy_key
  from auth.users u
 cross join (values ('Work',     'blue',   'briefcase', 0, 'work'),
                    ('Personal', 'rose',   'heartHand', 1, 'personal'),
                    ('Learning', 'violet', 'book',      2, 'learning'),
                    ('Health',   'green',  'activity',  3, 'health'))
         as d(name, color, icon, position, legacy_key)
 where not exists (select 1 from public.categories c where c.user_id = u.id)
on conflict do nothing;

-- ------------------------------------------------------------- accomplishments

alter table public.accomplishments
  add column if not exists category_id uuid references public.categories(id) on delete restrict;

update public.accomplishments a
   set category_id = c.id
  from public.categories c
 where a.category_id is null
   and c.user_id = a.user_id
   and c.legacy_key = a.category;

-- Defensive: anything still unmatched goes to the user's first category, so the
-- NOT NULL below cannot fail the migration.
update public.accomplishments a
   set category_id = (select c.id
                        from public.categories c
                       where c.user_id = a.user_id
                       order by c.position, c.created_at
                       limit 1)
 where a.category_id is null;

alter table public.accomplishments alter column category_id set not null;

create index if not exists accomplishments_category_id_idx
  on public.accomplishments (category_id);

alter table public.accomplishments drop constraint if exists accomplishments_category_check;
alter table public.accomplishments alter column category drop not null;
alter table public.accomplishments
  add constraint accomplishments_category_check
  check (category is null or category in ('work','personal','learning','health'));

/* Resolves the legacy text column to a category_id for old clients, rejects a
   category_id that belongs to someone else (FK checks bypass RLS), and mirrors
   the legacy_key back into `category` so old clients can still read new rows
   that use a default category. */
create or replace function public.accomplishments_sync_category()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  -- An old client changed only the text column: re-resolve from it.
  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id
     and new.category is distinct from old.category
     and new.category is not null then
    new.category_id := null;
  end if;

  if new.category_id is null then
    if new.category is null then
      raise exception 'category_id is required' using errcode = 'not_null_violation';
    end if;
    perform public.seed_default_categories(new.user_id);
    select id into new.category_id
      from public.categories
     where user_id = new.user_id and legacy_key = new.category;
    if new.category_id is null then
      -- The user deleted that default; fall back to their first category,
      -- preferring a remaining default so stale clients still get a non-null
      -- `category` they can render.
      select id, legacy_key into new.category_id, new.category
        from public.categories
       where user_id = new.user_id
       order by (legacy_key is null), position, created_at
       limit 1;
    end if;
  elsif tg_op = 'INSERT' or new.category_id is distinct from old.category_id then
    select legacy_key into v_key
      from public.categories
     where id = new.category_id and user_id = new.user_id;
    if not found then
      raise exception 'unknown category' using errcode = 'foreign_key_violation';
    end if;
    new.category := v_key;
  end if;
  return new;
end;
$$;

drop trigger if exists accomplishments_sync_category on public.accomplishments;
create trigger accomplishments_sync_category
  before insert or update on public.accomplishments
  for each row execute function public.accomplishments_sync_category();

-- ------------------------------------------------------------ delete_category

/* Moves every win in p_id to p_move_to, then deletes p_id, in one transaction.
   SECURITY INVOKER, so RLS still scopes every statement to the caller. Since
   p_move_to must be a different category, the last category can never go. */
create or replace function public.delete_category(p_id uuid, p_move_to uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_found integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_move_to is null or p_id = p_move_to then
    raise exception 'choose a different category to move wins into' using errcode = 'check_violation';
  end if;

  select count(*) into v_found
    from (select id from public.categories
           where user_id = v_user and id in (p_id, p_move_to)
           for update) s;
  if v_found <> 2 then
    raise exception 'category not found' using errcode = 'no_data_found';
  end if;

  update public.accomplishments
     set category_id = p_move_to
   where user_id = v_user and category_id = p_id;

  delete from public.categories where id = p_id and user_id = v_user;
end;
$$;

revoke execute on function public.delete_category(uuid, uuid) from public, anon;
grant execute on function public.delete_category(uuid, uuid) to authenticated;
