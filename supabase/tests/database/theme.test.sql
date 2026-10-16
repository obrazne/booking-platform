-- Theme isolation: owners edit only their tenant's theme, guests read it through tenant_theme().
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'recep-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'reception');
insert into public.tenant_themes (tenant_id) values
  ('10000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.tenant_themes), 1, 'owner sees only own theme');
select lives_ok($$ update public.tenant_themes set primary_color = '#112233' where tenant_id = '10000000-0000-0000-0000-00000000000a' $$,
  'owner updates own theme');
update public.tenant_themes set primary_color = '#445566' where tenant_id = '10000000-0000-0000-0000-00000000000b';
select throws_ok($$ update public.tenant_themes set primary_color = 'red' where tenant_id = '10000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'invalid colour is rejected');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
update public.tenant_themes set primary_color = '#000000' where tenant_id = '10000000-0000-0000-0000-00000000000a';
select is((select primary_color from public.tenant_themes), '#112233', 'reception cannot change the theme');

reset request.jwt.claims;
set local role anon;
select is((select primary_color from public.tenant_theme('10000000-0000-0000-0000-00000000000b')), '#2f5d50',
  'guest reads theme via function; owner A did not change tenant B');
select throws_ok('select count(*) from public.tenant_themes', '42501', null, 'anon cannot read the table');

select * from finish();
rollback;
