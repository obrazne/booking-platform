-- Online check-in (Z36): guest fills in through the link, rules of the country, sensitive fields only for the owner
-- (masked for the team, every view audited), instructions after check-in, erasing after the retention period.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'reception-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, timezone) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'Europe/Bratislava'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'Europe/Bratislava');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'reception'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status, checkin_required_for_instructions) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published', true);
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temp table t (token text, id uuid);
grant all on t to anon, authenticated;
insert into t (token, id)
select c.access_token, c.id from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 30000, 'status', 'confirmed',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 30000, 'amount_cents', 30000)),
  'check_in', (current_date + 2)::text, 'check_out', (current_date + 5)::text)) c;

select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select public.save_checkin((select id from t), '{}'::jsonb, (select token from t)) $$,
  'P0001', 'module_off', 'without the module no check-in');
reset role;
insert into public.tenant_modules (tenant_id, module_key, status)
  values ('10000000-0000-0000-0000-00000000000a', 'checkin', 'active');

set local role anon;
select throws_ok($$ select public.save_checkin((select id from t), '{}'::jsonb, 'wrong') $$, '42501', null,
  'a wrong token is refused');
select lives_ok($$ select public.save_checkin((select id from t), jsonb_build_object(
  'arrival_time', '16:30', 'house_rules_accepted', true,
  'guests', jsonb_build_array(
    jsonb_build_object('first_name', 'Anna', 'last_name', 'Nová', 'is_citizen', true, 'document_type', 'id_card',
      'document_number', 'EA 123456', 'address', 'Hlavná 1, Poprad'),
    jsonb_build_object('first_name', 'John', 'last_name', 'Smith', 'is_citizen', false, 'nationality', 'gb',
      'document_type', 'passport', 'document_number', '123456789', 'address', '1 High St, London'))),
  (select token from t)) $$, 'the guest saves the check-in through the link');
select throws_ok($$ select public.complete_checkin((select id from t), (select token from t)) $$, 'P0001',
  'incomplete', 'a foreigner needs the date of birth (rules SK)');
reset role;
select is(public.checkin_missing((select id from t)), '["1.birth_date"]'::jsonb, 'exactly what is missing');
select is(public.arrival_instructions_visible((select id from t)), false, 'no instructions before check-in');

set local role anon;
select lives_ok($$ select public.save_checkin((select id from t), jsonb_build_object(
  'arrival_time', '16:30', 'house_rules_accepted', true,
  'guests', jsonb_build_array(
    jsonb_build_object('first_name', 'Anna', 'last_name', 'Nová', 'is_citizen', true, 'document_type', 'id_card',
      'document_number', 'EA 123456', 'address', 'Hlavná 1, Poprad'),
    jsonb_build_object('first_name', 'John', 'last_name', 'Smith', 'is_citizen', false, 'nationality', 'gb',
      'birth_date', '1980-05-01', 'document_type', 'passport', 'document_number', '123456789',
      'address', '1 High St, London'))),
  (select token from t)) $$, 'the guest adds it');
select lives_ok($$ select public.complete_checkin((select id from t), (select token from t)) $$, 'and completes');
select throws_ok($$ select * from public.checkin_guests $$, '42501', null, 'anonymous reads nothing directly');
reset role;
select is((select status from public.checkins where reservation_id = (select id from t)), 'completed', 'completed');
select is((select count(*)::int from public.notifications where kind = 'checkin_completed'), 1, 'the team is told');
select is(public.arrival_instructions_visible((select id from t)), true, 'instructions unlock after check-in');
select is((select document_number from public.checkin_guests where last_name = 'Nová'), 'EA123456',
  'the number is stored without spaces');

-- Reception: masked, no direct read, no reveal.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select document_masked from public.checkin_people((select id from t)) where last_name = 'Nová'),
  '••••56', 'the team sees the document masked');
select is((select count(*)::int from public.checkin_guests), 0, 'the team does not read the persons directly');
select throws_ok($$ select * from public.reveal_checkin_guest((select id from public.checkin_people((select id from t))
  where last_name = 'Smith')) $$, '42501', null, 'only the owner reveals');
-- Owner of another client.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$ select * from public.checkin_people((select id from t)) $$, '42501', null,
  'another client sees nothing');
-- Owner reveals; the view is audited.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select birth_date from public.reveal_checkin_guest((select id from public.checkin_people((select id from t))
  where last_name = 'Smith'))), date '1980-05-01', 'the owner sees the date of birth');
reset role;
select is((select count(*)::int from public.audit_log where action = 'checkin.revealed'
  and tenant_id = '10000000-0000-0000-0000-00000000000a'), 1, 'and the view is in the audit');

-- Retention: the stay ended long ago → sensitive fields are erased.
update public.reservation_items set check_in = current_date - 800, check_out = current_date - 797
  where reservation_id = (select id from t);
select public.checkin_tick();
select is((select count(*)::int from public.checkin_guests where reservation_id = (select id from t)
  and document_number is null and birth_date is null and purged_at is not null), 2,
  'document numbers and dates of birth are erased after the retention period');

select * from finish();
rollback;
