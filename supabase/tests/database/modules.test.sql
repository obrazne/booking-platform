-- Module switches: owners read their tenant's switches, only the platform admin changes them.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000f1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.tenant_modules (tenant_id, module_key, status, trial_ends_at) values
  ('10000000-0000-0000-0000-00000000000a', 'services', 'trial', current_date - 1),
  ('10000000-0000-0000-0000-00000000000b', 'services', 'active', null);

select ok(not public.is_module_enabled('10000000-0000-0000-0000-00000000000a', 'services'), 'expired trial is off');
select ok(public.is_module_enabled('10000000-0000-0000-0000-00000000000b', 'services'), 'active module is on');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.tenant_modules), 1, 'owner sees only own switches');
update public.tenant_modules set status = 'active' where tenant_id = '10000000-0000-0000-0000-00000000000a';
select is((select status from public.tenant_modules), 'trial', 'owner cannot switch modules');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select lives_ok($$ update public.tenant_modules set status = 'active', trial_ends_at = null
  where tenant_id = '10000000-0000-0000-0000-00000000000a' $$, 'admin switches a module');
select throws_ok($$ update public.tenant_modules set status = 'trial', trial_ends_at = null
  where tenant_id = '10000000-0000-0000-0000-00000000000a' $$, '23514', null, 'trial needs an end date');

select * from finish();
rollback;
