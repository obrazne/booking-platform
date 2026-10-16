-- Security hardening (Z16): guest record columns, profile columns, time zone, hold limits, unit token.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, aud, role, instance_id, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'anna@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now());
insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);
insert into public.guests (tenant_id, email, user_id) values
  ('10000000-0000-0000-0000-00000000000a', 'anna@test.local', '00000000-0000-0000-0000-0000000000c1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok($$ update public.guests set email = 'victim@test.local' $$, '42501', null, 'guest cannot change own e-mail');
select lives_ok($$ update public.guests set phone = '+421900000000' $$, 'guest can change own phone');
select throws_ok($$ update public.profiles set email = 'info@obrazne.sk' $$, '42501', null, 'user cannot change profile e-mail');
select throws_ok($$ update public.tenants set timezone = 'Foo/Bar' where id = '10000000-0000-0000-0000-00000000000a' $$,
  '22023', null, 'invalid time zone is refused');
select lives_ok($$ update public.tenants set timezone = 'Europe/Prague' where id = '10000000-0000-0000-0000-00000000000a' $$,
  'valid time zone is accepted');
reset role;

select throws_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, expires_at)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
          daterange(current_date + 1, current_date + 400), 'hold', now() + interval '30 minutes') $$,
  '22023', null, 'a hold over a year is refused');
insert into public.occupancy (tenant_id, unit_id, nights, kind, expires_at)
select '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
       daterange(current_date + 10 * g, current_date + 10 * g + 2), 'hold', now() + interval '30 minutes'
from generate_series(1, 3) g;
select throws_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, expires_at)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
          daterange(current_date + 50, current_date + 52), 'hold', now() + interval '30 minutes') $$,
  '54000', null, 'a fourth open hold on one unit is refused');

set local role anon;
select throws_ok($$ select ical_export_token from public.units $$, '42501', null, 'anonymous visitor cannot read export tokens');
select lives_ok($$ select id, name, max_guests from public.units $$, 'anonymous visitor reads public unit columns');
reset role;

select * from finish();
rollback;
