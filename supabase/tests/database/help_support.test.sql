-- Pomoc (Z67): "Nenašli ste odpoveď?" only for the team of the client, the platform admin is told (bell + e-mail),
-- the team cannot read the requests; feedback on guides is one per person and question, counted for the control center.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select isnt(public.support_request_create('10000000-0000-0000-0000-00000000000a', '/admin/blocks',
  'Ako zablokujem termín?', null, 'test'), null, 'a member of the team sends a request');
select throws_ok($$select public.support_request_create('10000000-0000-0000-0000-00000000000b', '/admin', 'x', null, null)$$,
  '42501', null, 'not for another client');
select throws_ok($$select public.support_request_create('10000000-0000-0000-0000-00000000000a', '/admin', 'x',
  '10000000-0000-0000-0000-00000000000b/00000000-0000-0000-0000-000000000000.png', null)$$,
  '22023', null, 'a picture only from the folder of the own client');
select is((select count(*)::int from public.support_requests), 0, 'the team does not read the requests');

insert into public.help_feedback (faq_id, user_id, tenant_id, helpful) values
  ('blockDates', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', false);
select throws_ok($$insert into public.help_feedback (faq_id, user_id, helpful)
  values ('blockDates', '00000000-0000-0000-0000-0000000000b1', true)$$,
  '42501', null, 'feedback only in the own name');
select lives_ok($$insert into public.help_feedback (faq_id, user_id, tenant_id, helpful)
  values ('blockDates', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', true)
  on conflict (faq_id, user_id) do update set helpful = excluded.helpful, updated_at = now()$$,
  'the answer can be changed');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select message from public.support_requests), 'Ako zablokujem termín?', 'the platform admin reads the request');
select is((select count(*)::int from public.notifications where kind = 'support_request' and audience = 'platform'
           and target = '/platform/support'), 1, 'the platform admin is told in the bell');
reset role;
select is((select count(*)::int from public.email_outbox where kind = 'platform_support_request'), 1,
  'and by e-mail');
select is((select array[yes, no] from public.help_feedback_stats() where faq_id = 'blockDates'), array[1, 0],
  'counts per question');

select * from finish();
rollback;
