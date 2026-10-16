-- Tenant isolation tests (ARCHITEKTURA A2). Run: `npx supabase test db` (CI runs it against a local stack).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'clean-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000f1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

insert into public.tenants (id, slug, name)
values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');

insert into public.tenant_domains (tenant_id, hostname, is_primary)
values
  ('10000000-0000-0000-0000-00000000000a', 'a.test.local', true),
  ('10000000-0000-0000-0000-00000000000b', 'b.test.local', true);

insert into public.memberships (tenant_id, user_id, role)
values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'cleaning'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');

insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000f1');

insert into public.audit_log (tenant_id, action, entity)
values
  ('10000000-0000-0000-0000-00000000000a', 'test', 'tenant'),
  ('10000000-0000-0000-0000-00000000000b', 'test', 'tenant');

select is((select count(*)::int from public.profiles where email like '%@test.local'), 4,
  'auth trigger creates a profile for each user');

-- ---------------------------------------------------------------------------
-- Owner of tenant A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select results_eq('select slug from public.tenants order by slug', array['tenant-a'],
  'owner A sees only tenant A');
select is((select count(*)::int from public.tenant_domains), 1, 'owner A sees only own domains');
select is((select count(*)::int from public.memberships), 2, 'owner A sees the team of tenant A only');
select is((select count(*)::int from public.profiles), 2, 'owner A sees profiles of own team only');
select is((select count(*)::int from public.audit_log), 1, 'owner A sees only tenant A audit');
select is((select count(*)::int from public.platform_admins), 0, 'owner A does not see platform admins');

update public.tenants set name = 'Hacked' where id = '10000000-0000-0000-0000-00000000000b';
select is((select name from public.tenants where id = '10000000-0000-0000-0000-00000000000a'), 'Tenant A',
  'owner A did not change own tenant by mistake');

select lives_ok($$ update public.tenants set name = 'Tenant A2' where id = '10000000-0000-0000-0000-00000000000a' $$,
  'owner A can rename own tenant');
select throws_ok($$ update public.tenants set status = 'suspended' where id = '10000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'owner A cannot change tenant status');
select throws_ok($$ insert into public.memberships (tenant_id, user_id, role)
  values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'owner') $$,
  '42501', null, 'owner A cannot join tenant B');
select throws_ok($$ insert into public.tenants (slug, name) values ('rogue', 'Rogue') $$,
  '42501', null, 'owner cannot create tenants');
select throws_ok($$ select public.write_audit('10000000-0000-0000-0000-00000000000b', 'x', 'tenant') $$,
  '42501', null, 'owner A cannot write audit for tenant B');
select lives_ok($$ select public.write_audit('10000000-0000-0000-0000-00000000000a', 'x', 'tenant') $$,
  'owner A can write audit for tenant A');
select throws_ok($$ insert into public.audit_log (tenant_id, action, entity)
  values ('10000000-0000-0000-0000-00000000000a', 'x', 'tenant') $$,
  '42501', null, 'audit log is not writable directly');

-- ---------------------------------------------------------------------------
-- Cleaning role in tenant A
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is((select count(*)::int from public.tenants), 1, 'cleaning sees own tenant');
select is((select count(*)::int from public.memberships), 1, 'cleaning sees only own membership');
select is((select count(*)::int from public.profiles), 1, 'cleaning sees only own profile');
select is((select count(*)::int from public.audit_log), 0, 'cleaning does not see audit log');
update public.tenants set name = 'By cleaning' where id = '10000000-0000-0000-0000-00000000000a';
select is((select name from public.tenants where id = '10000000-0000-0000-0000-00000000000a'), 'Tenant A2',
  'cleaning cannot edit tenant');

-- ---------------------------------------------------------------------------
-- Anonymous guest
-- ---------------------------------------------------------------------------
reset request.jwt.claims;
set local role anon;
select throws_ok('select count(*) from public.tenants', '42501', null, 'anon cannot read tenants');
select is((select slug from public.tenant_by_host('B.test.local:3000')), 'tenant-b',
  'anon resolves tenant by host');

-- ---------------------------------------------------------------------------
-- Platform admin
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select is((select count(*)::int from public.tenants where slug like 'tenant-%'), 2, 'admin sees all tenants');
select lives_ok($$ update public.tenants set status = 'suspended' where id = '10000000-0000-0000-0000-00000000000b' $$,
  'admin can suspend a tenant');

select * from finish();
rollback;
