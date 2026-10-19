-- Z62: Mesačný výpis (vizuál administrácie v1.4, dosky 12–13) — core, not a module (A14).
-- One place of calculation: revenue and occupancy come from tenant_monthly_stats (the Statistics page); the report adds
-- the comparison with last year, the savings on commission, the work the system did (counted from existing data —
-- e-mails of the outbox, bookings by guests, iCal, check-ins, orders) and what needed a person, and the outlook.
-- Nothing is estimated backwards: all the counts come from rows that exist since the start of the platform.

-- tenant_monthly_stats as in 20261017130000_tenant_stats.sql; changed (v1.4): revenue without the tax for
-- accommodation and deposits (lines 'tax', 'deposit') — they are not the owner's revenue.
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
    select r.id,
           r.total_cents - coalesce((select sum(l.amount_cents) from public.reservation_lines l
                                     where l.reservation_id = r.id and l.kind in ('tax', 'deposit')), 0)
             as total_cents
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

-- Settings of the report: minutes per task (an estimate the owner can change), the accountant's e-mail, the e-mail
-- of the report on the 1st of the month (on by default).
alter table public.tenant_settings
  add column report_minutes jsonb not null
    default '{"email": 5, "booking": 45, "sync": 15, "checkin": 30, "order": 15}'::jsonb
    check (jsonb_typeof(report_minutes) = 'object'),
  add column accountant_email text
    check (accountant_email is null or accountant_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  add column monthly_report_email boolean not null default true;

create or replace function public.tenant_monthly_report(p_tenant_id uuid, p_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_m date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_next_end date := (date_trunc('month', p_month) + interval '2 months')::date;
  v_default jsonb := '{"email": 5, "booking": 45, "sync": 15, "checkin": 30, "order": 15}'::jsonb;
  v_tz text;
  v_bp integer;
  v_min jsonb;
  s record;
  ly record;
  nx record;
  v_ytd bigint;
  v_ly_data boolean;
  v_portal_stays integer;
  v_ly_direct_share numeric;
  v_channels jsonb;
  v_work jsonb;
  v_human jsonb;
  v_weekends jsonb;
  v_waiting jsonb;
  v_contacts integer;
  v_contacts_new integer;
  v_first date;
  v_has_ical boolean;
  m_from timestamptz;
  m_to timestamptz;
begin
  if not (public.is_platform_admin() or public.is_tenant_member(p_tenant_id)
          or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(t.timezone, 'Europe/Bratislava') into v_tz from public.tenants t where t.id = p_tenant_id;
  v_tz := coalesce(v_tz, 'Europe/Bratislava');
  select st.portal_commission_bp, v_default || coalesce(st.report_minutes, '{}'::jsonb)
    into v_bp, v_min
    from public.tenant_settings st where st.tenant_id = p_tenant_id;
  v_bp := coalesce(v_bp, 1500);
  v_min := coalesce(v_min, v_default);
  -- The month in the client's time zone (timestamps of tasks).
  m_from := v_m::timestamp at time zone v_tz;
  m_to := v_end::timestamp at time zone v_tz;

  select * into s from public.tenant_monthly_stats(p_tenant_id, v_m, v_m);
  select * into ly from public.tenant_monthly_stats(p_tenant_id, (v_m - interval '1 year')::date,
                                                     (v_m - interval '1 year')::date);
  select * into nx from public.tenant_monthly_stats(p_tenant_id, v_end, v_end);
  select coalesce(sum(x.revenue_cents), 0) into v_ytd
    from public.tenant_monthly_stats(p_tenant_id, date_trunc('year', v_m)::date, v_m) x;
  v_ly_data := coalesce(ly.revenue_cents, 0) > 0 or coalesce(ly.occupied_nights, 0) > 0;

  -- Stays from portals that arrive in the month (closed dates of Booking are not stays).
  select count(*) into v_portal_stays
    from public.occupancy o
    where o.tenant_id = p_tenant_id and o.kind = 'ical' and o.is_blocking
      and lower(o.nights) >= v_m and lower(o.nights) < v_end and coalesce(o.label, '') !~* '^closed';

  -- Nights by channel: portals by the source of their calendar (direct nights come from the stats).
  select coalesce(jsonb_object_agg(x.src, x.n), '{}'::jsonb) into v_channels from (
    select coalesce(c.source, 'other') as src, count(distinct (o.unit_id, d::date)) as n
    from public.occupancy o
    join public.ical_channels c on c.id = o.ical_channel_id
    cross join lateral generate_series(lower(o.nights), upper(o.nights) - 1, interval '1 day') d
    where o.tenant_id = p_tenant_id and o.kind = 'ical' and o.is_blocking and d >= v_m and d < v_end
    group by 1
  ) x;

  select exists (select 1 from public.ical_channels c where c.tenant_id = p_tenant_id) into v_has_ical;

  -- What the system did (counted from existing rows).
  v_work := jsonb_build_object(
    'email', (select count(*) from public.email_outbox e
              where e.tenant_id = p_tenant_id and e.kind like 'guest%' and e.kind <> 'guest_message'
                and e.status = 'sent' and e.sent_at >= m_from and e.sent_at < m_to)
             + (select count(*) from public.messages m
                where m.tenant_id = p_tenant_id and m.sender = 'auto' and m.email_via is null
                  and m.created_at >= m_from and m.created_at < m_to),
    'booking', (select count(*) from public.reservations r
                where r.tenant_id = p_tenant_id and r.source = 'direct'
                  and r.status in ('confirmed', 'in_progress', 'completed')
                  and r.created_at >= m_from and r.created_at < m_to),
    'sync', case when v_has_ical then
              (select count(*) from public.reservations r
               where r.tenant_id = p_tenant_id and r.source in ('direct', 'manual')
                 and r.status in ('confirmed', 'in_progress', 'completed')
                 and r.created_at >= m_from and r.created_at < m_to)
              + (select count(*) from public.occupancy o
                 where o.tenant_id = p_tenant_id and o.kind = 'ical' and o.is_blocking
                   and coalesce(o.label, '') !~* '^closed'
                   and o.created_at >= m_from and o.created_at < m_to)
            else 0 end,
    'checkin', (select count(*) from public.checkins c
                where c.tenant_id = p_tenant_id and c.status = 'completed'
                  and c.completed_via in ('account', 'link')
                  and c.completed_at >= m_from and c.completed_at < m_to),
    'order', (select count(*) from public.reservation_orders o
              where o.tenant_id = p_tenant_id and o.ordered_via in ('account', 'link')
                and o.status not in ('declined', 'cancelled')
                and o.created_at >= m_from and o.created_at < m_to));

  -- What needed a person.
  v_human := jsonb_build_object(
    'payments', (select count(*) from public.payments p
                 where p.tenant_id = p_tenant_id and p.status = 'received' and p.received_by is not null
                   and p.received_at >= m_from and p.received_at < m_to),
    'replies', (select count(*) from public.messages m
                where m.tenant_id = p_tenant_id and m.sender = 'staff'
                  and m.created_at >= m_from and m.created_at < m_to),
    'collisions', (select count(*) from public.occupancy o
                   where o.tenant_id = p_tenant_id
                     and o.conflict_resolved_at >= m_from and o.conflict_resolved_at < m_to),
    'manual', (select count(*) from public.reservations r
               where r.tenant_id = p_tenant_id and r.source = 'manual'
                 and r.created_at >= m_from and r.created_at < m_to));

  -- Own contacts: guests of the client who agreed to offers; new = created in the month.
  select count(*) filter (where g.marketing_consent),
         count(*) filter (where g.marketing_consent and g.created_at >= m_from and g.created_at < m_to)
    into v_contacts, v_contacts_new
    from public.guests g where g.tenant_id = p_tenant_id;

  -- Free weekends of the next month: Friday and Saturday nights when at least one active unit is free.
  select coalesce(jsonb_agg(to_char(f, 'YYYY-MM-DD') order by f), '[]'::jsonb) into v_weekends
    from generate_series(v_end, v_next_end - 1, interval '1 day') f
    where extract(isodow from f) = 5
      and exists (select 1 from public.units u
                  where u.tenant_id = p_tenant_id and u.active
                    and not exists (select 1 from public.occupancy o
                                    where o.unit_id = u.id and o.is_blocking
                                      and o.nights && daterange(f::date, (f + interval '2 days')::date, '[)')));

  v_waiting := jsonb_build_object(
    'unpaid', (select count(*) from public.reservations r
               where r.tenant_id = p_tenant_id and r.status = 'pending_payment'),
    'collisions', (select count(*) from public.occupancy o
                   where o.tenant_id = p_tenant_id and o.conflict and o.conflict_resolved_at is null),
    'cancel_requests', (select count(*) from public.reservations r
                        where r.tenant_id = p_tenant_id and r.cancellation_requested_at is not null
                          and r.status not in ('cancelled', 'completed')),
    'messages', case when public.is_module_enabled(p_tenant_id, 'messages')
                     then (select count(*) from (
                             select distinct on (m.reservation_id) m.sender
                             from public.messages m where m.tenant_id = p_tenant_id
                             order by m.reservation_id, m.created_at desc) last where last.sender = 'guest')
                     else 0 end);

  -- The first month with data (the switcher of months starts there).
  select date_trunc('month', least(
           (select min(r.created_at) from public.reservations r where r.tenant_id = p_tenant_id),
           (select min(o.created_at) from public.occupancy o where o.tenant_id = p_tenant_id and o.kind = 'ical')
         ) at time zone v_tz)::date into v_first;

  v_ly_direct_share := case when v_ly_data and coalesce(ly.occupied_nights, 0) > 0
                            then round(ly.nights_sold::numeric / ly.occupied_nights, 4) end;

  return jsonb_build_object(
    'month', v_m,
    'first_month', v_first,
    'commission_bp', v_bp,
    'minutes', v_min,
    'revenue_cents', coalesce(s.revenue_cents, 0),
    'nights_sold', coalesce(s.nights_sold, 0),
    'direct_stays', coalesce(s.reservations, 0),
    'portal_stays', v_portal_stays,
    'occupied_nights', coalesce(s.occupied_nights, 0),
    'available_nights', coalesce(s.available_nights, 0),
    'saved_cents', coalesce(s.revenue_cents, 0) * v_bp / 10000,
    'saved_ytd_cents', v_ytd * v_bp / 10000,
    'direct_share', case when coalesce(s.occupied_nights, 0) > 0
                         then round(s.nights_sold::numeric / s.occupied_nights, 4) end,
    'last_year', case when v_ly_data then jsonb_build_object(
      'revenue_cents', ly.revenue_cents, 'nights_sold', ly.nights_sold,
      'occupied_nights', ly.occupied_nights, 'available_nights', ly.available_nights,
      'direct_stays', ly.reservations, 'direct_share', v_ly_direct_share) end,
    'channels', v_channels,
    'contacts', v_contacts,
    'contacts_new', v_contacts_new,
    'work', v_work,
    'human', v_human,
    'next', jsonb_build_object(
      'revenue_cents', coalesce(nx.revenue_cents, 0),
      'direct_stays', coalesce(nx.reservations, 0),
      'occupied_nights', coalesce(nx.occupied_nights, 0),
      'available_nights', coalesce(nx.available_nights, 0),
      'free_weekends', v_weekends),
    'waiting', v_waiting);
end;
$$;

comment on function public.tenant_monthly_report(uuid, date) is
  'Mesačný výpis of a client (Z62, v1.4): the numbers of tenant_monthly_stats, comparison, savings, work, outlook.';

revoke execute on function public.tenant_monthly_report(uuid, date) from public, anon;
grant execute on function public.tenant_monthly_report(uuid, date) to authenticated, service_role;

-- New e-mail to the owner: the report of the previous month, on the 1st of the month in the morning. The list of kinds
-- is that of the latest migration (…290000) + the new one.
alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer', 'guest_message', 'owner_message', 'owner_monthly_report'));

-- One report per client and month.
create unique index email_outbox_monthly_report_idx on public.email_outbox (tenant_id, (payload ->> 'month'))
  where kind = 'owner_monthly_report';

-- On the 1st of the month: the report of the previous month for every client that had a stay in it (direct or from
-- a portal) and has the e-mail on.
create or replace function public.monthly_reports_tick()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_month date := (date_trunc('month', now() at time zone 'Europe/Bratislava') - interval '1 month')::date;
  v_end date := date_trunc('month', now() at time zone 'Europe/Bratislava')::date;
begin
  insert into public.email_outbox (tenant_id, kind, payload)
  select t.id, 'owner_monthly_report', jsonb_build_object('month', to_char(v_month, 'YYYY-MM-DD'))
  from public.tenants t
  left join public.tenant_settings st on st.tenant_id = t.id
  where coalesce(st.monthly_report_email, true)
    and t.status in ('active', 'onboarding')
    and (exists (select 1 from public.reservations r
                 join public.reservation_items i on i.reservation_id = r.id
                 where r.tenant_id = t.id and r.status in ('confirmed', 'in_progress', 'completed')
                   and i.check_in < v_end and i.check_out > v_month)
         or exists (select 1 from public.occupancy o
                    where o.tenant_id = t.id and o.kind = 'ical' and o.is_blocking
                      and coalesce(o.label, '') !~* '^closed'
                      and o.nights && daterange(v_month, v_end, '[)')))
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.monthly_reports_tick() from public, anon, authenticated;
grant execute on function public.monthly_reports_tick() to service_role;

-- 1st of the month, 05:00 UTC (6:00 / 7:00 in Slovakia).
select cron.schedule('monthly-reports', '0 5 1 * *', $$select public.monthly_reports_tick()$$);
