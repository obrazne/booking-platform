-- Owner statistics (Z27): revenue by date of stay across month and year boundaries, only paid direct reservations,
-- occupancy with portals but without owner blocks, empty months, and RLS (another tenant sees nothing).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create function pg_temp.book(p_email text, p_in date, p_out date, p_total integer, p_source text default 'direct')
returns void language sql as $$
  select null from public.create_reservation(jsonb_build_object(
    'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
    'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'guest_email', p_email,
    'adults', 2, 'currency', 'EUR', 'total_cents', p_total, 'lines', '[]'::jsonb, 'status', 'pending_payment',
    'source', p_source, 'check_in', p_in::text, 'check_out', p_out::text));
$$;

-- Across the month boundary: 3 nights for 300.01 € → January 200.00, February 100.01 (parts add up exactly).
select pg_temp.book('cross-month@test.local', '2025-01-30', '2025-02-02', 30001);
-- Across the year boundary: the night of 31 Dec belongs to December 2024, not to January.
select pg_temp.book('cross-year@test.local', '2024-12-31', '2025-01-01', 5000);
-- Cancelled and waiting for payment do not count.
select pg_temp.book('cancelled@test.local', '2025-03-10', '2025-03-12', 99900);
select pg_temp.book('pending@test.local', '2025-03-14', '2025-03-16', 99900);
update public.reservations set status = 'confirmed'
  where guest_email in ('cross-month@test.local', 'cross-year@test.local');
update public.reservations set status = 'cancelled' where guest_email = 'cancelled@test.local';
update public.occupancy set is_blocking = false
  where reservation_id = (select id from public.reservations where guest_email = 'cancelled@test.local');
-- Portal stay counts as occupied, owner block does not.
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/a.ics');
insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2025-03-20', '2025-03-23'), 'ical',
   '40000000-0000-0000-0000-00000000000a', 'b1');
insert into public.occupancy (tenant_id, unit_id, nights, kind, label) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2025-03-25', '2025-03-28'), 'block', 'Údržba');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
create temporary table s as
  select * from public.tenant_monthly_stats('10000000-0000-0000-0000-00000000000a', '2025-01-01', '2025-03-31');

select is((select count(*)::int from s), 3, 'one row per month, empty months included');
select is((select revenue_cents from s where month = '2025-01-01'), 20000::bigint,
  'January: two nights of the stay across the month boundary');
select is((select revenue_cents from s where month = '2025-02-01'), 10001::bigint,
  'February: the last night, parts add up to the total');
select is((select nights_sold from s where month = '2025-01-01'), 2,
  'the night of 31 December belongs to the previous year');
select is((select reservations from s where month = '2025-01-01'), 1, 'arrivals are counted in the month of arrival');
select is((select revenue_cents from s where month = '2025-03-01'), 0::bigint,
  'cancelled and unpaid reservations bring no revenue');
select is((select occupied_nights from s where month = '2025-03-01'), 3,
  'portal nights count as occupied, owner blocks do not');
select is((select available_nights from s where month = '2025-02-01'), 28, 'available = active units × days');
select is((select future_cents from s where month = '2025-01-01'), 0::bigint, 'past nights are not future revenue');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select sum(revenue_cents) from public.tenant_monthly_stats('10000000-0000-0000-0000-00000000000a', '2025-01-01', '2025-03-31')),
  0::numeric, 'staff of another tenant sees nothing');

select * from finish();
rollback;
