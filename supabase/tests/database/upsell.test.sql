-- Upsell (Z35): orders after the reservation — access (account, link, team), window, cutoff, limit of the stay
-- account, frozen price, confirmation, cancellation, settlement. The reservation's own lines never change.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000d1', 'anna@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, timezone) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'Europe/Bratislava'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'Europe/Bratislava');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.guests (tenant_id, email, user_id, name) values
  ('10000000-0000-0000-0000-00000000000a', 'anna@test.local', '00000000-0000-0000-0000-0000000000d1', 'Anna');
insert into public.tenant_settings (tenant_id, stay_account_limit_cents) values
  ('10000000-0000-0000-0000-00000000000a', 20000);
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);
insert into public.services (id, tenant_id, name, price_model, amount_cents, upsell_enabled, upsell_cutoff_hours,
  upsell_requires_confirmation, max_quantity) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', '{"sk": "Raňajky"}',
   'per_person_night', 1000, true, 24, false, null),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', '{"sk": "Šéfkuchár"}',
   'per_item', 15000, true, 48, true, 2),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a', '{"sk": "Len v košíku"}',
   'per_stay', 500, false, 24, false, null);

-- 2 adults, 3 nights, starting in 10 days, confirmed; the token is returned once by create_reservation.
create temp table t (token text, id uuid);
grant all on t to anon, authenticated;
insert into t (token, id)
select c.access_token, c.id from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 30000, 'status', 'pending_payment',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 30000, 'amount_cents', 30000)),
  'check_in', (current_date + 10)::text, 'check_out', (current_date + 13)::text)) c;

-- Module off, then on; the reservation still waits for payment.
set local role anon;
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000001', 1,
  null, 'stay_account', null, (select token from t)) $$, 'P0001', 'module_off', 'without the module no orders');
reset role;
insert into public.tenant_modules (tenant_id, module_key, status) values
  ('10000000-0000-0000-0000-00000000000a', 'services', 'active'),
  ('10000000-0000-0000-0000-00000000000a', 'upsell', 'active');
set local role anon;
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000001', 1,
  null, 'stay_account', null, (select token from t)) $$, 'P0001', 'not_confirmed', 'only after confirmation');
reset role;
update public.reservations set status = 'confirmed' where id = (select id from t);

-- Through the access link.
set local role anon;
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000001', 1,
  null, 'stay_account', null, 'wrong-token') $$, '42501', null, 'a wrong token is refused');
select lives_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000001', 1,
  null, 'stay_account', null, (select token from t)) $$, 'the guest orders through the link');
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000003', 1,
  null, 'stay_account', null, (select token from t)) $$, 'P0001', 'service_unavailable',
  'only services offered after the reservation');
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000001', 1,
  null, 'card', null, (select token from t)) $$, 'P0001', 'card_unavailable', 'no card payments yet');
reset role;

select is((select amount_cents from public.reservation_orders where label = 'Raňajky'), 6000,
  'frozen price: 10 € × 2 persons × 3 nights');
select is((select status from public.reservation_orders where label = 'Raňajky'), 'confirmed',
  'without confirmation the order is valid at once');
select is((select count(*)::int from public.notifications where kind = 'order_new'), 1, 'the team is told');
select is((select count(*)::int from public.email_outbox where kind = 'guest_order_received'
  and reservation_id = (select id from t)), 1, 'the guest gets a confirmation of the order');
select is((select sum(amount_cents)::int from public.reservation_lines where reservation_id = (select id from t)), 30000,
  'the lines of the reservation do not change');

-- Guest account: chef (needs confirmation), 2 pieces → 300 € > limit 200 € on the account.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000002', 2,
  current_date + 11, 'stay_account') $$, 'P0001', 'over_limit', 'the limit of the stay account holds');
select lives_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000002', 2,
  current_date + 11, 'transfer') $$, 'above the limit the guest pays by transfer');
select throws_ok($$ select public.place_order((select id from t), '40000000-0000-0000-0000-000000000002', 1,
  current_date + 20, 'transfer') $$, 'P0001', 'date_outside_stay', 'the service date is within the stay');
select is((select count(*)::int from public.reservation_orders), 2, 'the guest sees their orders');
select throws_ok($$ select public.decide_order((select id from public.reservation_orders where label = 'Šéfkuchár'), true) $$,
  '42501', null, 'the guest does not confirm');
reset role;
select is((select status from public.reservation_orders where label = 'Šéfkuchár'), 'awaiting_confirmation',
  'an order needing confirmation waits');

-- Another client sees nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.reservation_orders), 0, 'another client does not see the orders');
-- Owner decides and settles.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ select public.decide_order((select id from public.reservation_orders where label = 'Šéfkuchár'),
  false, 'Šéfkuchár je v ten deň obsadený') $$, 'the owner declines with a reason');
select is((select count(*)::int from public.email_outbox where kind = 'guest_order_declined'), 1,
  'the guest is told');
select is((select open_cents from public.stay_account((select id from t))), 6000, 'open on the stay account');
select lives_ok($$ select public.settle_stay_account((select id from t), 'on_site') $$, 'Vyúčtovať');
select is((select paid_cents || '/' || open_cents from public.stay_account((select id from t))), '6000/0',
  'everything is paid');
reset role;
select is((select purpose from public.payments where reservation_id = (select id from t) and status = 'received'),
  'stay_account', 'the settlement is a payment of the stay account');

-- The cutoff: the breakfast order closed 24 h before arrival.
update public.reservation_orders set cutoff_at = now() - interval '1 hour', paid_at = null, payment_id = null
  where label = 'Raňajky';
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select public.cancel_order((select id from public.reservation_orders_for((select id from t),
  (select token from t)) where label = 'Raňajky'), (select token from t)) $$, 'P0001', 'cutoff_passed',
  'after the cutoff the guest cannot cancel');
reset role;

select * from finish();
rollback;
