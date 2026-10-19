-- Mesačný výpis (Z62): the numbers come from tenant_monthly_stats (revenue without the tax for accommodation),
-- savings from the commission, comparison only with data of last year, work of the system and of a person, RLS
-- (another client's owner gets an error), and the e-mail on the 1st of the month only for a client with a stay.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.tenant_settings (tenant_id, portal_commission_bp) values
  ('10000000-0000-0000-0000-00000000000a', 1500)
  on conflict (tenant_id) do update set portal_commission_bp = 1500;
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

-- A direct stay of 2 nights in March 2025: 400 € of which 20 € tax for accommodation (not revenue).
select null from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'guest_email', 'march@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 40000, 'status', 'pending_payment',
  'lines', jsonb_build_array(
    jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2, 'unit_amount_cents', 19000, 'amount_cents', 38000),
    jsonb_build_object('kind', 'tax', 'label', 'Daň za ubytovanie', 'quantity', 4, 'unit_amount_cents', 500, 'amount_cents', 2000)),
  'source', 'direct', 'check_in', '2025-03-10', 'check_out', '2025-03-12'));
-- Confirmed, booked by the guest on 5 March (work is counted by when it happened).
update public.reservations set status = 'confirmed', created_at = '2025-03-05 10:00+01'
  where guest_email = 'march@test.local';
-- A Booking stay of 3 nights in March and a closed date (not a stay).
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/a.ics');
insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, created_at) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2025-03-20', '2025-03-23'), 'ical',
   '40000000-0000-0000-0000-00000000000a', 'b1', 'Reserved', '2025-03-08 12:00+01'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2025-03-25', '2025-03-26'), 'ical',
   '40000000-0000-0000-0000-00000000000a', 'b2', 'CLOSED - Not available', '2025-03-08 12:00+01');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
create temporary table r as
  select public.tenant_monthly_report('10000000-0000-0000-0000-00000000000a', '2025-03-15') as j;

select is((select (j ->> 'revenue_cents')::bigint from r),
  (select revenue_cents from public.tenant_monthly_stats('10000000-0000-0000-0000-00000000000a', '2025-03-01', '2025-03-01')),
  'revenue = the Statistics page (one place of calculation)');
select is((select (j ->> 'revenue_cents')::bigint from r), 38000::bigint, 'revenue without the tax for accommodation');
select is((select (j ->> 'saved_cents')::bigint from r), 5700::bigint, 'savings = direct revenue × 15 % commission');
select is((select (j ->> 'occupied_nights')::int from r), 6, 'occupancy with portals (closed dates too, as on Statistics)');
select is((select (j ->> 'portal_stays')::int from r), 1, 'a closed date of Booking is not a stay');
select is((select j -> 'channels' ->> 'booking' from r), '4', 'nights by the calendar''s portal');
select ok((select j -> 'last_year' = 'null'::jsonb from r), 'no data of last year → no comparison');
select is((select (j -> 'work' ->> 'booking')::int from r), 1, 'a stay booked by the guest counts as work of the system');
select is((select (j -> 'work' ->> 'sync')::int from r), 2,
  'calendars kept in sync: the direct booking and the portal stay (with a calendar connected)');
select is((select j ->> 'month' from r), '2025-03-01', 'the month starts on the 1st');

-- Another client's owner: not allowed.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok(
  $$select public.tenant_monthly_report('10000000-0000-0000-0000-00000000000a', '2025-03-01')$$,
  '42501', null, 'another client''s owner does not get the report');
reset role;

-- The e-mail on the 1st: a client with a stay in the previous month gets it once, a client without any does not.
update public.reservation_items set check_in = (date_trunc('month', now()) - interval '1 month' + interval '2 days')::date,
  check_out = (date_trunc('month', now()) - interval '1 month' + interval '4 days')::date
  where reservation_id = (select id from public.reservations where guest_email = 'march@test.local');
select public.monthly_reports_tick();
select public.monthly_reports_tick();
select is((select array_agg(tenant_id::text) from public.email_outbox where kind = 'owner_monthly_report'
           and tenant_id in ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b')),
  array['10000000-0000-0000-0000-00000000000a'], 'one report per client and month, only with a stay');

select * from finish();
rollback;
