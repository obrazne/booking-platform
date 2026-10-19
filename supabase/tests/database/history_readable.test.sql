-- Readable history (Z64): the synchronisation of a portal calendar is one summary entry per run (not a row per
-- event), marked is_sync; only changes made by people can be reverted.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
   'Airbnb chalet', 'airbnb', 'https://example.com/a.ics');

-- The synchronisation runs without a signed-in person.
select set_config('request.jwt.claims', '', true);
select public.ical_apply('40000000-0000-0000-0000-00000000000a', '[
  {"uid": "a", "start": "2031-10-16", "end": "2031-10-20", "summary": "Reserved"},
  {"uid": "b", "start": "2031-10-30", "end": "2031-11-02", "summary": "Reserved"}]'::jsonb);
select public.ical_apply('40000000-0000-0000-0000-00000000000a', '[
  {"uid": "a", "start": "2031-10-16", "end": "2031-10-21", "summary": "Reserved"}]'::jsonb);

select is((select count(*)::int from public.record_history
           where tenant_id = '10000000-0000-0000-0000-00000000000a' and table_name = 'occupancy'), 0,
  'events of the synchronisation are not recorded one by one');
select is((select array_agg((new_row ->> 'added') || '/' || (new_row ->> 'updated') || '/' || (new_row ->> 'removed') order by id)::text
           from public.record_history where table_name = 'ical_sync'
             and tenant_id = '10000000-0000-0000-0000-00000000000a'),
  '{2/0/0,0/1/1}', 'one summary per run: added, updated, removed');
select ok((select bool_and(is_sync) from public.record_history where table_name = 'ical_sync'
           and tenant_id = '10000000-0000-0000-0000-00000000000a'), 'summaries are marked as synchronisation');
select is((select jsonb_array_length(new_row -> 'events') from public.record_history where table_name = 'ical_sync'
           and tenant_id = '10000000-0000-0000-0000-00000000000a' order by id desc limit 1), 2,
  'the summary keeps the events in detail');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$select public.platform_revert_change((select min(id) from public.record_history where table_name = 'ical_sync'))$$,
  '22023', null, 'the synchronisation is not reverted — only changes by people');

select * from finish();
rollback;
