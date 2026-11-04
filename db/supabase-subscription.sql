-- JainJoy v3.0 – subscription, payments, invites, password help. Run once after supabase-setup.sql. Safe to run again.

-- plan and invite details on each customer
alter table public.customers add column if not exists paid_until  timestamptz;          -- null = never paid
alter table public.customers add column if not exists bonus_days  int not null default 0; -- extra free days from invites
alter table public.customers add column if not exists ref_code    text unique;
alter table public.customers add column if not exists referred_by uuid references public.customers(id) on delete set null;
update public.customers set ref_code = upper(substr(md5(id::text), 1, 6)) where ref_code is null;

-- UPI payments the customer reports; the admin confirms each one
create table if not exists public.payments (
  id           bigint generated always as identity primary key,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  utr          text not null check (char_length(utr) between 6 and 40),
  amount       int  not null default 199,
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
drop policy if exists "payments: own or admin" on public.payments;
create policy "payments: own or admin" on public.payments for select using (customer_id = auth.uid() or public.is_admin());
do $$ begin alter publication supabase_realtime add table public.payments; exception when duplicate_object then null; end $$;

-- sign-up: create the customer row with an invite code, and reward the friend who invited them
create or replace function public.handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  select id into ref from public.customers where ref_code = upper(coalesce(new.raw_user_meta_data->>'ref', '')) limit 1;
  insert into public.customers (id, name, phone, ref_code, referred_by)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone', ''),
          upper(substr(md5(new.id::text), 1, 6)), ref);
  if ref is not null then update public.customers set bonus_days = least(bonus_days + 7, 28) where id = ref; end if;
  return new;
end $$;

-- is this phone number registered? (lets Sign In say "please sign up" instead of "wrong password")
create or replace function public.phone_registered(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.customers where phone = p);
$$;

-- customer: report a UPI payment (one pending at a time)
create or replace function public.submit_payment(p_utr text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if exists (select 1 from public.payments where customer_id = auth.uid() and status = 'pending') then raise exception 'already pending'; end if;
  insert into public.payments (customer_id, utr) values (auth.uid(), trim(p_utr));
end $$;

-- customer: delete my own account and data
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.is_admin() then raise exception 'admins cannot delete themselves here'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- admin: confirm or reject a payment; confirming adds 1 year (from today, or from the current end if still paid)
create or replace function public.admin_decide_payment(pid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.payments set status = case when ok then 'confirmed' else 'rejected' end, decided_at = now()
    where id = pid and status = 'pending' returning customer_id into cid;
  if ok and cid is not null then
    update public.customers set paid_until = greatest(coalesce(paid_until, now()), now()) + interval '1 year' where id = cid;
  end if;
end $$;

-- admin: give a year directly (for cash or other payments)
create or replace function public.admin_grant_year(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.customers set paid_until = greatest(coalesce(paid_until, now()), now()) + interval '1 year' where id = cid;
end $$;

-- admin: set a temporary password for a customer who forgot theirs (bcrypt, like Supabase Auth)
create or replace function public.admin_reset_password(cid uuid, new_pw text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if char_length(new_pw) < 8 then raise exception 'password too short'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_pw, extensions.gen_salt('bf')), updated_at = now() where id = cid;
  delete from auth.sessions where user_id = cid;
end $$;

revoke all on function public.submit_payment(text), public.delete_my_account(), public.admin_decide_payment(bigint, boolean), public.admin_grant_year(uuid), public.admin_reset_password(uuid, text) from public, anon;
grant execute on function public.submit_payment(text), public.delete_my_account(), public.admin_decide_payment(bigint, boolean), public.admin_grant_year(uuid), public.admin_reset_password(uuid, text) to authenticated;
grant execute on function public.phone_registered(text) to anon, authenticated;
