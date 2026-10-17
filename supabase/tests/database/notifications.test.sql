-- Notifications (Z27): created from events, deduplicated, visible only to the right people, reading is personal.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'reception-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'reception'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

select null from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 10000, 'status', 'pending_payment',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 10000, 'amount_cents', 10000)),
  'check_in', (current_date + 20)::text, 'check_out', (current_date + 22)::text));

select is((select count(*)::int from public.notifications n join public.reservations r
  on n.dedupe_key = 'reservation_new:' || r.id where r.guest_email = 'anna@test.local'), 1,
  'a new reservation creates one notification');
select is((select data ->> 'guest' from public.notifications where tenant_id = '10000000-0000-0000-0000-00000000000a'
  and kind = 'reservation_new'), 'Anna',
  'the notification carries the facts for its text');
select public.notify('10000000-0000-0000-0000-00000000000a', 'tenant', 'reservation_new', '{}'::jsonb, '/admin',
  (select dedupe_key from public.notifications where tenant_id = '10000000-0000-0000-0000-00000000000a'
   and kind = 'reservation_new'));
select is((select count(*)::int from public.notifications where tenant_id = '10000000-0000-0000-0000-00000000000a'
  and kind = 'reservation_new'), 1,
  'the same event for the same record is not repeated');

-- Owner marks the payment: the notification exists for the team but is already read for the owner.
update public.payments set status = 'received', received_by = '00000000-0000-0000-0000-0000000000a1'
  where reservation_id = (select id from public.reservations where guest_email = 'anna@test.local');
select is((select count(*)::int from public.notification_reads r join public.notifications n on n.id = r.notification_id
  where n.kind = 'payment_received' and r.user_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'whoever marked the payment has it as read');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.notifications), 2, 'team member sees the notifications of their client');
select lives_ok($$ insert into public.notification_reads (notification_id, user_id)
  select id, '00000000-0000-0000-0000-0000000000a2' from public.notifications where kind = 'reservation_new' $$,
  'team member marks a notification as read for themselves');
select throws_ok($$ insert into public.notification_reads (notification_id, user_id)
  select id, '00000000-0000-0000-0000-0000000000a1' from public.notifications where kind = 'reservation_new' $$,
  '42501', null, 'nobody marks notifications for someone else');
select throws_ok($$ insert into public.notifications (tenant_id, audience, kind, dedupe_key)
  values ('10000000-0000-0000-0000-00000000000a', 'tenant', 'reservation_new', 'x') $$,
  '42501', null, 'notifications are not written directly');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.notifications), 0, 'another client sees nothing');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.notifications where audience = 'platform'), 0,
  'platform notifications (new client) are not for owners');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.notifications where kind = 'client_new'
  and tenant_id in ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b')), 2,
  'the platform admin sees new clients');

reset role;
delete from public.reservations where guest_email = 'anna@test.local';
select is((select count(*)::int from public.notifications where tenant_id = '10000000-0000-0000-0000-00000000000a'
  and audience = 'tenant'), 0,
  'notifications go with the deleted reservation');

select * from finish();
rollback;
