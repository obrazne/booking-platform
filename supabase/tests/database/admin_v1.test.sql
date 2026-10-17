-- Administration v1 (Z23): extending the payment deadline only by the tenant's staff and only while waiting for
-- payment; portal commission defaults to 15 %.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

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
insert into public.tenant_settings (tenant_id) values ('10000000-0000-0000-0000-00000000000a');

set local role service_role;
select * from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 0, 'lines', '[]'::jsonb, 'status', 'pending_payment',
  'check_in', (current_date + 20)::text, 'check_out', (current_date + 22)::text));
reset role;
create temporary table rid as select id, payment_due_at from public.reservations where guest_email = 'anna@test.local';
grant select on rid to authenticated;

select is((select portal_commission_bp from public.tenant_settings where tenant_id = '10000000-0000-0000-0000-00000000000a'),
  1500, 'portal commission defaults to 15 %');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$ select public.extend_payment_due((select id from rid), 24) $$, '42501', null,
  'staff of another tenant cannot extend the deadline');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.extend_payment_due((select id from rid), 1000) $$, '22023', null,
  'extension is limited to 14 days');
select ok(public.extend_payment_due((select id from rid), 48) >= now() + interval '47 hours',
  'owner extends the deadline by 48 hours');
reset role;
select ok((select payment_due_at from public.reservations where id = (select id from rid)) > now() + interval '47 hours',
  'new deadline is stored');

update public.reservations set status = 'confirmed' where id = (select id from rid);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.extend_payment_due((select id from rid), 24) $$, '22023', null,
  'a paid reservation has no deadline to extend');

select * from finish();
rollback;
