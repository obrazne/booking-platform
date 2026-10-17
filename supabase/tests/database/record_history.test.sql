-- History of changes and the trash (Z31): the trigger records insert/update/delete with who and how, only the
-- platform admin reads it, the owner restores deleted things (with their dependent rows), collisions are refused,
-- the admin reverts a change and is warned when the record changed again.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

-- The owner works in the administration.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.services (id, tenant_id, name, amount_cents, price_model) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '{"sk":"Raňajky"}', 1500, 'per_person_night');
update public.services set amount_cents = 1800 where id = '40000000-0000-0000-0000-00000000000a';
insert into public.seasons (id, tenant_id, property_id, name) values
  ('50000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '{"sk":"Zima"}');
insert into public.season_ranges (tenant_id, season_id, start_date, end_date) values
  ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', '2030-01-01', '2030-02-28');
insert into public.rates (tenant_id, season_id, unit_id, amount_cents) values
  ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 90000);
insert into public.occupancy (id, tenant_id, unit_id, nights, kind, label) values
  ('60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
   daterange('2030-03-01', '2030-03-05'), 'block', 'Údržba');
delete from public.services where id = '40000000-0000-0000-0000-00000000000a';
delete from public.seasons where id = '50000000-0000-0000-0000-00000000000a';
delete from public.occupancy where id = '60000000-0000-0000-0000-00000000000a';

select is((select count(*)::int from public.record_history), 0, 'the owner does not read the history directly');
select ok((select count(*) from public.owner_trash('10000000-0000-0000-0000-00000000000a')
  where table_name in ('services', 'seasons', 'occupancy')) = 3, 'the trash lists what the owner deleted');
select is((select count(*)::int from public.owner_trash('10000000-0000-0000-0000-00000000000a')
  where table_name in ('rates', 'season_ranges')), 0, 'prices that went with a season are not separate items');
reset role;

select is((select array_agg(op order by id)::text from public.record_history where table_name = 'services'),
  '{insert,update,delete}', 'insert, update and delete are recorded');
select is((select (old_row ->> 'amount_cents') || '→' || (new_row ->> 'amount_cents') from public.record_history
  where table_name = 'services' and op = 'update'), '1500→1800', 'before and after are kept');
select is((select distinct source from public.record_history where table_name = 'services'), 'user',
  'changes by the client''s staff are marked as their own');
select is((select changed_by from public.record_history where table_name = 'services' and op = 'delete'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'who changed it is kept');

-- A block over the deleted block's dates appears in the meantime (a job, nobody signed in).
select set_config('request.jwt.claims', '', true);
insert into public.occupancy (tenant_id, unit_id, nights, kind, label) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-03-02', '2030-03-04'), 'block', 'Iná');
select is((select source from public.record_history where table_name = 'occupancy' order by id desc limit 1), 'system',
  'changes without a signed-in person are marked as the system');

-- History ids for the people who cannot read the history themselves.
create temporary table h as
  select table_name, op, old_row ->> 'label' as label, min(id) as id from public.record_history
  group by table_name, op, old_row ->> 'label';
grant select on h to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.owner_restore((select id from h where table_name = 'services' and op = 'delete')), 'ok',
  'the owner restores a deleted service');
select is((select amount_cents from public.services where id = '40000000-0000-0000-0000-00000000000a'), 1800,
  'it comes back as it was');
select is(public.owner_restore((select id from h where table_name = 'seasons' and op = 'delete')), 'ok',
  'the owner restores a season');
select is((select count(*)::int from public.rates where season_id = '50000000-0000-0000-0000-00000000000a'), 1,
  'the season comes back with its prices');
select is(public.owner_restore((select id from h where table_name = 'occupancy' and op = 'delete'
  and label = 'Údržba')), 'conflict', 'a block over a term taken in the meantime is refused');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$ select * from public.owner_trash('10000000-0000-0000-0000-00000000000a') $$, '42501', null,
  'another client''s owner sees nothing');

-- The platform admin reverts the price change; a record changed again is not overwritten without asking.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is(public.platform_revert_change((select id from public.record_history where table_name = 'services' and op = 'update')) ->> 'status',
  'ok', 'the admin reverts a change');
update public.services set amount_cents = 2500 where id = '40000000-0000-0000-0000-00000000000a';
select is(public.platform_revert_change((select min(id) from public.record_history where table_name = 'services' and op = 'update')) ->> 'status',
  'changed', 'a record that changed again since is reported, not overwritten');

select * from finish();
rollback;
