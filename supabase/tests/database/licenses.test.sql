-- Z81: the licence of a client — only the platform admin records it (audit), the team reads its own; a suspended
-- licence stops new reservations (guest and by hand) and holds and makes the administration read only for the team;
-- the turnover of a month by A10 (stays, confirmed orders, the kept part of cancelled reservations).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'platform@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temporary table base on commit drop as select jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'adults', 2, 'currency', 'EUR',
  'total_cents', 50000, 'status', 'pending_payment', 'source', 'direct',
  'lines', jsonb_build_array(
    jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2, 'unit_amount_cents', 24000, 'amount_cents', 48000),
    jsonb_build_object('kind', 'tax', 'label', 'Daň', 'quantity', 4, 'unit_amount_cents', 500, 'amount_cents', 2000))) as p;

-- Turnover of March 2031: a stay of 480 € (+ 20 € tax, not counted), an order of 60 €, a cancelled stay with 100 €
-- kept (paid 100 €).
select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'pobyt@test.local', 'check_in', '2031-03-10', 'check_out', '2031-03-12'));
update public.reservations set status = 'confirmed' where guest_email = 'pobyt@test.local';
insert into public.services (id, tenant_id, property_id, name, price_model, amount_cents)
  values ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a',
          '20000000-0000-0000-0000-00000000000a', '{"sk":"Raňajky"}', 'per_stay', 6000);
insert into public.reservation_orders (tenant_id, reservation_id, service_id, label, price_model, quantity,
  unit_amount_cents, amount_cents, currency, status, service_date, cutoff_at, payment_method, ordered_via)
  select '10000000-0000-0000-0000-00000000000a', id, '40000000-0000-0000-0000-00000000000a', 'Raňajky', 'per_stay', 1,
         6000, 6000, 'EUR', 'confirmed', '2031-03-11', '2031-03-10 12:00+01', 'stay_account', 'staff'
  from public.reservations where guest_email = 'pobyt@test.local';
select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'storno@test.local', 'check_in', '2031-04-10', 'check_out', '2031-04-12'));
update public.payments set status = 'received', received_at = now(), amount_cents = 10000
  where reservation_id = (select id from public.reservations where guest_email = 'storno@test.local');
update public.reservations set status = 'cancelled' where guest_email = 'storno@test.local';
insert into public.reservation_status_history (tenant_id, reservation_id, from_status, to_status, changed_at)
  select tenant_id, id, 'pending_payment', 'cancelled', '2031-03-20 12:00+01'
  from public.reservations r where guest_email = 'storno@test.local'
    and not exists (select 1 from public.reservation_status_history h where h.reservation_id = r.id and h.to_status = 'cancelled');

-- Only the platform admin records the licence.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$select public.platform_save_license('10000000-0000-0000-0000-00000000000a', '{"number":"X"}')$$,
  '42501', null, 'the team cannot record its licence');
select throws_ok($$insert into public.tenant_licenses (tenant_id, number) values ('10000000-0000-0000-0000-00000000000a', 'X')$$,
  '42501', null, 'no licence by hand');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((public.platform_save_license('10000000-0000-0000-0000-00000000000a',
  '{"number":"BP-2031-001","package":"carefree","monthly_fee_cents":19000,"starts_on":"2031-01-01"}')).number,
  'BP-2031-001', 'the platform admin records it');
select is((public.tenant_license_turnover('10000000-0000-0000-0000-00000000000a', '2031-03-15') ->> 'stays_cents')::int,
  48000, 'stays: without the tax for accommodation');
select is((public.tenant_license_turnover('10000000-0000-0000-0000-00000000000a', '2031-03-15') ->> 'orders_cents')::int,
  6000, 'confirmed orders of services');
select is((public.tenant_license_turnover('10000000-0000-0000-0000-00000000000a', '2031-03-15') ->> 'kept_cents')::int,
  10000, 'the kept part of a cancelled reservation');
select is((public.platform_save_license('10000000-0000-0000-0000-00000000000a',
  '{"number":"BP-2031-001","package":"carefree","starts_on":"2031-01-01","state":"suspended"}')).state,
  'suspended', 'the platform admin suspends the licence');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'license.state_changed'
                  and tenant_id = '10000000-0000-0000-0000-00000000000a'), 'the change of the state is in the audit');

-- The team reads its licence, but cannot write anything of its client.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select state from public.tenant_licenses), 'suspended', 'the team sees its licence');
select throws_ok($$update public.properties set name = 'Nové' where id = '20000000-0000-0000-0000-00000000000a'$$,
  'LIC01', null, 'suspended: the administration is read only');
select is((select count(*)::int from public.properties where tenant_id = '10000000-0000-0000-0000-00000000000a'), 1,
  'reading works');
reset role;

-- No new reservation (the guest page uses the server key) and no hold.
select throws_ok($$select public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'nova@test.local', 'check_in', '2031-05-10', 'check_out', '2031-05-12'))$$,
  'LIC01', null, 'suspended: no new reservations');
select throws_ok($$insert into public.occupancy (tenant_id, unit_id, nights, kind, expires_at)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
          daterange('2031-06-10', '2031-06-12'), 'hold', now() + interval '30 minutes')$$,
  'LIC01', null, 'suspended: no hold of a term');

select * from finish();
rollback;
