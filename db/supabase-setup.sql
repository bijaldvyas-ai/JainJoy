-- JainJoy customers – run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again: every statement replaces or skips what already exists.
--
-- Passwords are never in this table. Supabase Auth keeps them in auth.users as bcrypt hashes,
-- which no admin screen, API key or customer can read.

-- 1. Tables -------------------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null unique check (phone ~ '^[0-9]{10}$'),
  status      text not null default 'active' check (status in ('active', 'blocked')),
  created_at  timestamptz not null default now(),
  last_login  timestamptz,
  last_seen   timestamptz            -- updated while the app is open; "Active now" = last 5 minutes
);
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.customers enable row level security;
alter table public.admins enable row level security;
-- signed-in users may read through row security (below); nobody outside writes directly
revoke all on public.customers, public.admins from anon, authenticated;
grant select on public.customers, public.admins to authenticated;

-- 2. Who is an admin ------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3. Every sign-up creates its customer row (name and phone from the sign-up form) ---------
create or replace function public.handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_customer();

-- 4. Row security: a customer sees only their own row; admins see everyone ------------------
drop policy if exists "customers: own row or admin" on public.customers;
create policy "customers: own row or admin" on public.customers
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "admins: self or admin" on public.admins;
create policy "admins: self or admin" on public.admins
  for select using (user_id = auth.uid() or public.is_admin());
-- no insert, update or delete policies: customers change nothing directly; admins use the functions below

-- 5. Functions the app calls --------------------------------------------------------------
create or replace function public.touch_login() returns void
language sql security definer set search_path = public as $$
  update public.customers set last_login = now(), last_seen = now() where id = auth.uid();
$$;
create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as $$
  update public.customers set last_seen = now() where id = auth.uid();
$$;
-- block / unblock: a blocked customer is banned in Supabase Auth, so login is refused by the server
-- and any open session is ended
create or replace function public.admin_set_status(cid uuid, new_status text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if new_status not in ('active', 'blocked') then raise exception 'invalid status'; end if;
  if cid = auth.uid() then raise exception 'you cannot block yourself'; end if;
  update public.customers set status = new_status where id = cid;
  update auth.users set banned_until = case when new_status = 'blocked' then now() + interval '100 years' else null end where id = cid;
  if new_status = 'blocked' then delete from auth.sessions where user_id = cid; end if;
end $$;
create or replace function public.admin_delete_customer(cid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if cid = auth.uid() then raise exception 'you cannot delete yourself'; end if;
  delete from auth.users where id = cid;   -- removes the login and, through the foreign key, the customer row
end $$;

revoke all on function public.touch_login(), public.touch_seen(), public.admin_set_status(uuid, text), public.admin_delete_customer(uuid) from public, anon;
grant execute on function public.touch_login(), public.touch_seen(), public.admin_set_status(uuid, text), public.admin_delete_customer(uuid), public.is_admin() to authenticated;

-- 6. Live updates for the admin dashboard -------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.customers;
exception when duplicate_object then null; end $$;

-- 7. Make yourself the admin: first sign up in the app with your own phone number, then run
--    this line with that number (only admins can open the Customers section):
-- insert into public.admins (user_id) select id from public.customers where phone = '9XXXXXXXXX' on conflict do nothing;
