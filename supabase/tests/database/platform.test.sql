-- Control center functions: only the platform admin may call them, and each change is audited.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000f1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000f1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.platform_create_tenant('X', 'x', 'x.test.local') $$, '42501', null,
  'non-admin cannot create a tenant');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select lives_ok($$ select public.platform_create_tenant('New Client', 'new-client', 'New.Test.Local') $$,
  'admin creates a tenant');
select is((select status from public.tenants where slug = 'new-client'), 'onboarding', 'new tenant is onboarding');
select is((select hostname from public.tenant_domains d join public.tenants t on t.id = d.tenant_id
  where t.slug = 'new-client'), 'new.test.local', 'domain stored lowercase');
select ok(exists (select 1 from public.tenant_themes th join public.tenants t on t.id = th.tenant_id
  where t.slug = 'new-client'), 'default theme created');

select lives_ok($$ select public.platform_set_module((select id from public.tenants where slug = 'new-client'),
  'services', 'trial', current_date + 14) $$, 'admin starts a trial');
select is((select count(*)::int from public.audit_log a join public.tenants t on t.id = a.tenant_id
  where t.slug = 'new-client'), 2, 'creation and module change are audited');
select throws_ok($$ select public.platform_create_tenant('Dup', 'new-client', 'dup.test.local') $$, '23505', null,
  'duplicate slug is rejected');

select * from finish();
rollback;
