-- Guest account (Z17): consent history, cancellation from the zone, no access to other guests or the login log.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, aud, role, instance_id, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'anna@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'boris@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now());
insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

set local role service_role;
select * from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 0, 'lines', '[]'::jsonb,
  'check_in', (current_date + 20)::text, 'check_out', (current_date + 22)::text));
reset role;
create temporary table rid as select id from public.reservations where guest_email = 'anna@test.local';
grant select on rid to authenticated;
insert into public.guest_auth_attempts (tenant_id, email, kind) values ('10000000-0000-0000-0000-00000000000a', 'anna@test.local', 'code_sent');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select public.claim_guest_account('10000000-0000-0000-0000-00000000000a');
select is(public.guest_request_cancellation((select id from rid)), false, 'another guest cannot request cancellation');
select throws_ok($$ select count(*) from public.guest_auth_attempts $$, '42501', null, 'login log is not readable');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select public.claim_guest_account('10000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.guests set marketing_consent = true $$, '42501', null,
  'consent is not changed directly');
select is(public.guest_set_marketing('10000000-0000-0000-0000-00000000000a', true), true, 'guest gives consent');
select is(public.guest_set_marketing('10000000-0000-0000-0000-00000000000a', false), false, 'guest revokes consent');
select is((select array_agg(granted order by created_at, granted desc) from public.guest_consent_events), array[true, false],
  'both changes are in the history');
select is((select marketing_consent from public.guests), false, 'current consent is off');
select is(public.guest_request_cancellation((select id from rid), 'Choroba'), true,
  'guest requests cancellation of own stay');
select ok((select cancellation_requested_at is not null from public.reservations where id = (select id from rid)),
  'request is recorded');

select * from finish();
rollback;
