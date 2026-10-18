-- State of the backups (Z52): only the platform admin reads and records a test restore; a backup row comes from the
-- workflow (service key); no successful backup for 36 hours → one platform notification a day.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner');

delete from public.platform_backups;
delete from public.notifications where kind = 'backup_stale';

-- No backup ever recorded (a fresh install): no alarm.
select public.backups_check();
select is((select count(*)::int from public.notifications where kind = 'backup_stale'), 0,
  'no alarm before the backups are set up');

-- The last successful backup two days ago.
insert into public.platform_backups (kind, ok, finished_at, size_bytes, tables_compared, files)
  values ('backup', true, now() - interval '2 days', 8000000, 92, 38),
         ('backup', false, now() - interval '1 day', null, null, null);
select public.backups_check();
select public.backups_check();
select is((select count(*)::int from public.notifications where kind = 'backup_stale' and audience = 'platform'), 1,
  'no successful backup for 36 hours → one platform notification a day');

insert into public.platform_backups (kind, ok, finished_at) values ('backup', true, now() - interval '2 hours');
delete from public.notifications where kind = 'backup_stale';
select public.backups_check();
select is((select count(*)::int from public.notifications where kind = 'backup_stale'), 0,
  'a fresh successful backup → no alarm');

-- Owner of a client: sees nothing, records nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.platform_backups), 0, 'a client owner does not see the backups');
select throws_ok(
  $$insert into public.platform_backups (kind, ok, note) values ('restore_test', true, 'x')$$,
  '42501', null, 'a client owner cannot record a test restore');

-- Platform admin: reads, records a test restore, never a backup row.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.platform_backups), 3, 'the platform admin sees the backups');
select lives_ok(
  $$insert into public.platform_backups (kind, ok, note) values ('restore_test', true, 'Rozšifrovanie a obsah')$$,
  'the platform admin records a test restore');
select throws_ok(
  $$insert into public.platform_backups (kind, ok) values ('backup', true)$$,
  '42501', null, 'a backup row comes only from the workflow');
reset role;

select * from finish();
rollback;
