-- Push notifications (Z33): own devices only, client devices need the module, the queue gets only notifications
-- some device wants, the worker claims each once.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'reception-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'reception');

-- Owner of A, module off.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values ('10000000-0000-0000-0000-00000000000a', 'https://push.example/a1', repeat('k', 40), repeat('s', 16),
  '{reservation_new}') $$, '42501', null, 'without the module a client device cannot be added');
reset role;

insert into public.tenant_modules (tenant_id, module_key, status)
  values ('10000000-0000-0000-0000-00000000000a', 'push', 'active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values ('10000000-0000-0000-0000-00000000000a', 'https://push.example/a1', repeat('k', 40), repeat('s', 16),
  '{reservation_new}') $$, 'with the module the owner adds their device');
select throws_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values ('10000000-0000-0000-0000-00000000000b', 'https://push.example/a1', repeat('k', 40), repeat('s', 16),
  '{}') $$, '42501', null, 'not for a client they are not in');
select throws_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values (null, 'https://push.example/a1', repeat('k', 40), repeat('s', 16), '{}') $$, '42501', null,
  'a platform device only for the platform admin');
select throws_ok($$ update public.push_subscriptions set failures = 0 $$, '42501', null,
  'delivery state is not writable by the user');
select throws_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values ('10000000-0000-0000-0000-00000000000a', 'https://push.example/a1b', repeat('k', 40), repeat('s', 16),
  '{guest_birthday}') $$, '23514', null, 'only known kinds');
select is((select count(*)::int from public.push_subscriptions), 1, 'the owner sees their device');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.push_subscriptions), 0, 'a colleague does not see it');
delete from public.push_subscriptions;
reset role;
select is((select count(*)::int from public.push_subscriptions), 1, 'and cannot remove it');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok($$ insert into public.push_subscriptions (tenant_id, endpoint, p256dh, auth, kinds)
  values (null, 'https://push.example/c1', repeat('k', 40), repeat('s', 16), '{client_new}') $$,
  'the platform admin adds a platform device without any module');
reset role;

-- Queue: only notifications some device wants.
select public.notify('10000000-0000-0000-0000-00000000000a', 'tenant', 'reservation_new', '{}'::jsonb, '/admin', 'push-t:1');
select public.notify('10000000-0000-0000-0000-00000000000a', 'tenant', 'payment_due', '{}'::jsonb, '/admin', 'push-t:2');
select public.notify('10000000-0000-0000-0000-00000000000a', 'platform', 'client_new', '{}'::jsonb, '/platform', 'push-t:3');
select is((select array_agg(n.dedupe_key order by n.dedupe_key) from public.push_queue q
  join public.notifications n on n.id = q.notification_id where n.dedupe_key like 'push-t:%'),
  array['push-t:1', 'push-t:3'], 'chosen kinds are queued, others not');

update public.tenant_modules set status = 'off' where tenant_id = '10000000-0000-0000-0000-00000000000a';
select public.notify('10000000-0000-0000-0000-00000000000a', 'tenant', 'reservation_new', '{}'::jsonb, '/admin', 'push-t:4');
select is((select count(*)::int from public.push_queue q join public.notifications n on n.id = q.notification_id
  where n.dedupe_key = 'push-t:4'), 0, 'module off: nothing is queued');

select ok((select count(*) from public.claim_push_jobs(200)) >= 2, 'the worker claims the queue');
select is((select count(*)::int from public.push_queue q join public.notifications n on n.id = q.notification_id
  where n.dedupe_key like 'push-t:%' and q.claimed_at is null), 0, 'each notification is claimed once');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok($$ select * from public.push_queue $$, '42501', null, 'nobody reads the queue');
select throws_ok($$ select public.claim_push_jobs(1) $$, '42501', null, 'only the worker claims');
reset role;

select * from finish();
rollback;
