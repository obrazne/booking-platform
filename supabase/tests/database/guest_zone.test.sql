-- Guest zone (B10): a guest belongs to one tenant, sees only own reservations there, access codes only for a
-- confirmed stay shortly before arrival, documents only for their own stays.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, aud, role, instance_id, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'anna@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'boris@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now()),
  ('00000000-0000-0000-0000-0000000000c3', 'nover@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', null);
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'pb', 'PB', 'published');
insert into public.property_private (property_id, tenant_id, arrival_instructions) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '{"sk":"Kód 4321"}');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'U', true, 6);

create temporary table payload as select jsonb_build_object(
  'guest_name', 'Anna', 'guest_email', 'Anna@Test.local', 'adults', 2, 'currency', 'EUR', 'total_cents', 0, 'lines', '[]'::jsonb) as p;
grant select on payload to service_role;

set local role service_role;
-- Anna books at A (soon) and at B; a far-future stay at A too.
select * from public.create_reservation((select p || jsonb_build_object('tenant_id','10000000-0000-0000-0000-00000000000a',
  'property_id','20000000-0000-0000-0000-00000000000a','unit_id','30000000-0000-0000-0000-00000000000a',
  'check_in', (current_date + 2)::text, 'check_out', (current_date + 4)::text) from payload));
select * from public.create_reservation((select p || jsonb_build_object('tenant_id','10000000-0000-0000-0000-00000000000a',
  'property_id','20000000-0000-0000-0000-00000000000a','unit_id','30000000-0000-0000-0000-00000000000a',
  'check_in', (current_date + 60)::text, 'check_out', (current_date + 62)::text) from payload));
select * from public.create_reservation((select p || jsonb_build_object('tenant_id','10000000-0000-0000-0000-00000000000b',
  'property_id','20000000-0000-0000-0000-00000000000b','unit_id','30000000-0000-0000-0000-00000000000b',
  'check_in', (current_date + 2)::text, 'check_out', (current_date + 4)::text) from payload));
reset role;

select is((select count(*)::int from public.guests where email = 'anna@test.local'), 2, 'same e-mail = one guest per tenant');
select is((select count(distinct guest_id)::int from public.reservations where tenant_id = '10000000-0000-0000-0000-00000000000a'), 1,
  'reservations at A share the guest');

insert into public.documents (tenant_id, property_id, title, storage_path, visible_when) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '{"sk":"Ubytovací poriadok"}', '10000000-0000-0000-0000-00000000000a/poriadok.pdf', 'confirmed');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok($$ select public.claim_guest_account('10000000-0000-0000-0000-00000000000a') $$, '42501', null,
  'unverified e-mail cannot claim a guest account');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok($$ select public.claim_guest_account('10000000-0000-0000-0000-00000000000a') $$, 'Anna claims her account at A');
select is((select count(*)::int from public.reservations), 2, 'Anna sees her 2 reservations at A, not the one at B');
select is((select count(*)::int from public.guests), 1, 'Anna sees only her guest record at A');
select ok((select public.guest_arrival_instructions(id) from public.reservations order by created_at limit 1) is null,
  'no access codes while the stay waits for payment');
select is((select count(*)::int from public.documents), 0, 'documents for confirmed stays are hidden before confirmation');

reset role;
reset request.jwt.claims;
update public.reservations set status = 'confirmed' where tenant_id = '10000000-0000-0000-0000-00000000000a';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select public.guest_arrival_instructions(r.id) ->> 'sk' from public.reservations r
           join public.reservation_items i on i.reservation_id = r.id where i.check_in = current_date + 2), 'Kód 4321',
  'access codes visible for a confirmed stay 2 days before arrival');
select ok((select public.guest_arrival_instructions(r.id) from public.reservations r
           join public.reservation_items i on i.reservation_id = r.id where i.check_in = current_date + 60) is null,
  'not yet for a stay two months ahead');
select is((select count(*)::int from public.documents), 1, 'document visible once the stay is confirmed');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.reservations), 0, 'another user sees no reservations');

select * from finish();
rollback;
