-- JainJoy visitor counter. Run once in Supabase → SQL Editor. Safe to run again.
-- One row per phone per day: a random device ID made by the app, the city it uses for timings,
-- how the person arrived and whether they made a meal plan. No names, phone numbers or exact locations.

create table if not exists public.visits (
  device_id  text not null check (char_length(device_id) between 8 and 64),
  day        date not null default ((now() at time zone 'Asia/Kolkata')::date),
  city       text check (char_length(city) <= 60),
  state      text check (char_length(state) <= 60),
  source     text check (source in ('direct', 'whatsapp', 'invite', 'other')),
  has_plan   boolean not null default false,
  opens      int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (device_id, day)
);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;   -- nobody reads or writes it directly

-- the app calls this every time it opens (anyone may call it; it only adds to the counts)
create or replace function public.log_visit(p_device text, p_city text, p_state text, p_source text, p_has_plan boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_device is null or char_length(p_device) not between 8 and 64 then return; end if;
  insert into public.visits (device_id, city, state, source, has_plan)
  values (p_device, nullif(left(trim(coalesce(p_city, '')), 60), ''), nullif(left(trim(coalesce(p_state, '')), 60), ''),
          case when p_source in ('direct', 'whatsapp', 'invite', 'other') then p_source else 'direct' end, coalesce(p_has_plan, false))
  on conflict (device_id, day) do update set
    opens = public.visits.opens + 1,
    last_seen = now(),
    city = coalesce(excluded.city, public.visits.city),
    state = coalesce(excluded.state, public.visits.state),
    has_plan = public.visits.has_plan or excluded.has_plan;
end $$;

-- the owner's Visitors page reads everything through this (admins only)
create or replace function public.visitor_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Kolkata')::date; res json;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select json_build_object(
    'total',       (select count(distinct device_id) from visits),
    'today',       (select count(distinct device_id) from visits where day = d),
    'week',        (select count(distinct device_id) from visits where day > d - 7),
    'month',       (select count(distinct device_id) from visits where day > d - 30),
    'new_today',   (select count(*) from (select device_id from visits group by device_id having min(day) = d) x),
    'opens_today', (select coalesce(sum(opens), 0) from visits where day = d),
    'opens_total', (select coalesce(sum(opens), 0) from visits),
    'planners',    (select count(distinct device_id) from visits where has_plan),
    'days',    (select coalesce(json_agg(x order by x.day), '[]') from (select day, count(distinct device_id) as people, sum(opens) as opens from visits where day > d - 14 group by day) x),
    'cities',  (select coalesce(json_agg(c), '[]') from (select coalesce(city, 'Unknown') as city, coalesce(state, '') as state, count(distinct device_id) as people from visits group by 1, 2 order by 3 desc, 1 limit 30) c),
    'sources', (select coalesce(json_agg(s), '[]') from (select coalesce(source, 'direct') as source, count(distinct device_id) as people from (select distinct on (device_id) device_id, source from visits order by device_id, day) f group by 1 order by 2 desc) s)
  ) into res;
  return res;
end $$;

revoke all on function public.log_visit(text, text, text, text, boolean), public.visitor_stats() from public;
grant execute on function public.log_visit(text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.visitor_stats() to authenticated;
revoke execute on function public.visitor_stats() from anon;

-- headline numbers for the "Data and about" page: totals only, nothing about any visitor
create or replace function public.visitor_summary() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(distinct device_id) from visits),
    'today', (select count(distinct device_id) from visits where day = (now() at time zone 'Asia/Kolkata')::date),
    'planners', (select count(distinct device_id) from visits where has_plan));
$$;
grant execute on function public.visitor_summary() to anon, authenticated;
