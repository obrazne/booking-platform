-- Sign-ins in the audit (Z28): who and how, the client of a one-client person, nothing for unknown methods.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.audit_sign_in('password');
select public.audit_sign_in('anything');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select public.audit_sign_in('link');
reset role;

select is((select count(*)::int from public.audit_log
  where actor_id = '00000000-0000-0000-0000-0000000000a1' and action = 'auth.signed_in'), 1,
  'one entry per sign-in, unknown methods are ignored');
select is((select tenant_id from public.audit_log
  where actor_id = '00000000-0000-0000-0000-0000000000a1' and action = 'auth.signed_in'),
  '10000000-0000-0000-0000-00000000000a'::uuid, 'the sign-in of a one-client owner belongs to the client');
select is((select data ->> 'method' from public.audit_log
  where actor_id = '00000000-0000-0000-0000-0000000000a1' and action = 'auth.signed_in'), 'password',
  'how the person signed in is recorded (never the password)');
select ok((select tenant_id is null from public.audit_log
  where actor_id = '00000000-0000-0000-0000-0000000000c1' and action = 'auth.signed_in'),
  'the platform admin''s sign-in belongs to no client');

select * from finish();
rollback;
