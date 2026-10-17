-- Owner statistics (Z27, vizuál administrácie v1.2): one function for the Statistics page, the overview chart and
-- the control center. Security invoker — row level security decides what the caller sees (staff of the tenant, platform admin).
--
-- Rules:
--   * revenue by date of stay: the reservation total is split evenly over its nights (whole cents, the remainder spread
--     so the parts add up exactly), each night counts in the month it falls in;
--   * only direct reservations (web and manual) in status confirmed / in progress / completed;
--   * occupied nights = direct nights + nights from portals (iCal), owner blocks not counted; one unit-night counts once;
--   * available nights = active units × days of the month.

create or replace function public.tenant_monthly_stats(p_tenant_id uuid, p_from date, p_to date)
returns table (
  month date,
  revenue_cents bigint,
  -- part of revenue_cents for nights that have not happened yet (confirmed future stays)
  future_cents bigint,
  nights_sold integer,
  reservations integer,
  occupied_nights integer,
  available_nights integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select date_trunc('month', p_from)::date as first_month,
           (date_trunc('month', p_to) + interval '1 month')::date as end_date,
           (now() at time zone coalesce(
              (select t.timezone from public.tenants t where t.id = p_tenant_id), 'Europe/Bratislava'))::date as today
  ),
  months as (
    select gs::date as m
    from params, generate_series(params.first_month, params.end_date - 1, interval '1 month') gs
  ),
  direct as (
    select r.id, r.total_cents
    from public.reservations r
    where r.tenant_id = p_tenant_id
      and r.source in ('direct', 'manual')
      and r.status in ('confirmed', 'in_progress', 'completed')
  ),
  direct_nights as (
    select d.id, i.unit_id, n::date as night, d.total_cents::bigint as total,
           row_number() over (partition by d.id order by n, i.unit_id) - 1 as k,
           count(*) over (partition by d.id) as cnt
    from direct d
    join public.reservation_items i on i.reservation_id = d.id
    cross join lateral generate_series(i.check_in, i.check_out - 1, interval '1 day') n
  ),
  night_money as (
    select id, unit_id, night, (total * (k + 1)) / cnt - (total * k) / cnt as cents
    from direct_nights
  ),
  arrivals as (
    select d.id, min(i.check_in) as check_in
    from direct d join public.reservation_items i on i.reservation_id = d.id
    group by d.id
  ),
  portal_nights as (
    select o.unit_id, n::date as night
    from public.occupancy o
    cross join lateral generate_series(lower(o.nights), upper(o.nights) - 1, interval '1 day') n
    where o.tenant_id = p_tenant_id and o.kind = 'ical' and o.is_blocking
  ),
  occupied as (
    select unit_id, night from night_money
    union
    select unit_id, night from portal_nights
  ),
  active_units as (
    select count(*)::integer as n from public.units u where u.tenant_id = p_tenant_id and u.active
  )
  select
    m.m,
    coalesce((select sum(nm.cents) from night_money nm where date_trunc('month', nm.night) = m.m), 0)::bigint,
    coalesce((select sum(nm.cents) from night_money nm, params
              where date_trunc('month', nm.night) = m.m and nm.night >= params.today), 0)::bigint,
    (select count(*) from night_money nm where date_trunc('month', nm.night) = m.m)::integer,
    (select count(*) from arrivals a where date_trunc('month', a.check_in) = m.m)::integer,
    (select count(*) from occupied o where date_trunc('month', o.night) = m.m)::integer,
    (active_units.n * extract(day from (m.m + interval '1 month' - interval '1 day')))::integer
  from months m, active_units
  order by m.m;
$$;

comment on function public.tenant_monthly_stats(uuid, date, date) is
  'Monthly revenue (by date of stay, direct only), nights, arrivals and occupancy of a tenant; respects RLS.';

revoke execute on function public.tenant_monthly_stats(uuid, date, date) from public, anon;
grant execute on function public.tenant_monthly_stats(uuid, date, date) to authenticated;
