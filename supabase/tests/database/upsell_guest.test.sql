-- Upsell for guests (Z37): an order per chosen day (a per-night service counts that one night), all days at once
-- or none, and the offer e-mail before arrival on the client's days, once.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

insert into public.tenants (id, slug, name, timezone) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'Europe/Bratislava');
insert into public.tenant_settings (tenant_id, stay_account_limit_cents) values
  ('10000000-0000-0000-0000-00000000000a', 10000);
insert into public.tenant_modules (tenant_id, module_key, status) values
  ('10000000-0000-0000-0000-00000000000a', 'services', 'active'),
  ('10000000-0000-0000-0000-00000000000a', 'upsell', 'active');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);
insert into public.services (id, tenant_id, name, price_model, amount_cents, upsell_enabled, upsell_cutoff_hours) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', '{"sk": "Raňajky"}',
   'per_person_night', 1500, true, 24);

-- 2 adults, 3 nights from in 7 days (the first offer day by default), confirmed.
create temp table t (token text, id uuid);
grant all on t to anon, authenticated;
insert into t (token, id)
select c.access_token, c.id from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 30000, 'status', 'confirmed',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 30000, 'amount_cents', 30000)),
  'check_in', (current_date + 7)::text, 'check_out', (current_date + 10)::text)) c;

set local role anon;
select lives_ok($$ select public.place_orders((select id from t), '40000000-0000-0000-0000-000000000001',
  array[current_date + 7, current_date + 9], 1, 'stay_account', null, (select token from t)) $$,
  'breakfast on two days through the link');
reset role;
select is((select count(*)::int from public.reservation_orders), 2, 'an order per day');
select is((select string_agg(amount_cents::text, ',' order by service_date) from public.reservation_orders), '3000,3000',
  'one day = one night: 15 € × 2 persons');
select is((select count(*)::int from public.reservation_orders where cutoff_at =
    ((service_date::timestamp at time zone 'Europe/Bratislava') - interval '24 hours')), 2,
  'each day closes 24 hours before it');

-- 60 € open, limit 100 €: two more days (60 €) do not fit — neither is ordered.
set local role anon;
select throws_ok($$ select public.place_orders((select id from t), '40000000-0000-0000-0000-000000000001',
  array[current_date + 8, current_date + 8, current_date + 10], 1, 'stay_account', null, (select token from t)) $$,
  'P0001', 'over_limit', 'the limit counts the days of the same call');
reset role;
select is((select count(*)::int from public.reservation_orders), 2, 'all days or none');
set local role anon;
select lives_ok($$ select public.place_orders((select id from t), '40000000-0000-0000-0000-000000000001',
  array[current_date + 8], 1, 'transfer', null, (select token from t)) $$, 'above the limit by transfer');
reset role;

-- Offers before arrival: today is 7 days before → one e-mail, never twice.
select is(public.upsell_tick(), 1, 'the offer e-mail is queued on the offer day');
select is(public.upsell_tick(), 0, 'and only once');
update public.tenant_settings set upsell_offer_days = '{3}' where tenant_id = '10000000-0000-0000-0000-00000000000a';
delete from public.email_outbox where kind = 'guest_upsell_offer';
select is(public.upsell_tick(), 0, 'other days set by the client → nothing today');

select * from finish();
rollback;
