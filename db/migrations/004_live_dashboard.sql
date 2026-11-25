-- JainJoy live dashboard. Run once in Supabase → SQL Editor (after supabase-visitors.sql). Safe to run again.
-- Adds: a light "still here" ping so the owner can see who is using the app right now,
-- and one admin-only function with live users, totals and growth for 7, 15 and 30 days.

-- the open app calls this every minute while it is on screen; it only moves last_seen forward
create or replace function public.visit_ping(p_device text)
returns void language sql security definer set search_path = public as $$
  update public.visits set last_seen = now()
  where device_id = p_device and day = (now() at time zone 'Asia/Kolkata')::date;
$$;
revoke all on function public.visit_ping(text) from public;
grant execute on function public.visit_ping(text) to anon, authenticated;

create index if not exists visits_last_seen_idx on public.visits (last_seen);
create index if not exists visits_day_idx on public.visits (day);

-- growth = people in the last N days compared with the N days before that
create or replace function public.visitor_dashboard() returns json
language plpgsql stable security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Kolkata')::date; res json;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select json_build_object(
    'now',    now(),
    'online', (select count(distinct device_id) from visits where last_seen > now() - interval '5 minutes'),
    'today',  (select count(distinct device_id) from visits where day = d),
    'total',  (select count(distinct device_id) from visits),
    'growth', (select json_agg(json_build_object('days', n,
                 'cur',  (select count(distinct device_id) from visits where day > d - n),
                 'prev', (select count(distinct device_id) from visits where day > d - 2 * n and day <= d - n),
                 'new',  (select count(*) from (select device_id from visits group by device_id having min(day) > d - n) x)
               ) order by n) from unnest(array[7, 15, 30]) n),
    'series', (select json_agg(json_build_object('day', g::date,
                 'people', (select count(distinct device_id) from visits where day = g::date),
                 'new',    (select count(*) from (select device_id from visits group by device_id having min(day) = g::date) y)
               ) order by g) from generate_series(d - 59, d, interval '1 day') g)
  ) into res;
  return res;
end $$;
revoke all on function public.visitor_dashboard() from public;
grant execute on function public.visitor_dashboard() to authenticated;
revoke execute on function public.visitor_dashboard() from anon;
