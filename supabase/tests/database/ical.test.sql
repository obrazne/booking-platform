-- iCal import: new events block, collisions become conflicts (never overwrite), removed events free the term,
-- export hides guest data and can exclude the requesting channel.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'p', 'P', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, ical_export_token) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 'tok-a');
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/b.ics');
insert into public.occupancy (tenant_id, unit_id, nights, kind, label) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-10', '2030-01-12'), 'block', 'Údržba');

select is((public.ical_apply('40000000-0000-0000-0000-00000000000a',
  '[{"uid":"e1","start":"2030-01-01","end":"2030-01-04","summary":"Booking"},{"uid":"e2","start":"2030-01-11","end":"2030-01-13"}]') ->> 'added')::int,
  1, 'one event added');
select is((select count(*)::int from public.occupancy where ical_uid = 'e2' and conflict and not is_blocking), 1,
  'colliding event stored as non-blocking conflict');
select is((select last_status from public.ical_channels), 'conflict', 'channel shows conflict');
select is((select count(*)::int from public.email_outbox where kind = 'owner_ical_conflict'), 1, 'owner is notified');

select is(jsonb_array_length(public.ical_apply('40000000-0000-0000-0000-00000000000a',
  '[{"uid":"e1","start":"2030-01-01","end":"2030-01-04"},{"uid":"e2","start":"2030-01-11","end":"2030-01-13"}]') -> 'conflicts'),
  0, 'unchanged conflict is not reported again');
select is((select count(*)::int from public.email_outbox where kind = 'owner_ical_conflict'), 1, 'no repeated mail');

select is((public.ical_apply('40000000-0000-0000-0000-00000000000a', '[{"uid":"e2","start":"2030-01-11","end":"2030-01-13"}]') ->> 'removed')::int,
  1, 'event removed from the feed frees the term');

set local role anon;
select is((select count(*)::int from public.ical_export('tok-a')), 1, 'export shows the owner block (conflicts are not blocking)');
select is((select count(*)::int from public.ical_export('tok-a', '40000000-0000-0000-0000-00000000000a')), 1,
  'export for the channel itself excludes its own events');

select * from finish();
rollback;
