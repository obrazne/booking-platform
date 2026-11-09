-- Widget with data-obsadenost="ical": only nights from the iCal of active channels (also those in conflict),
-- never reservations or blocks of the application; nothing for a property that is not published.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'p', 'P', 'published'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'd', 'D', 'draft');
insert into public.units (id, tenant_id, property_id, name, is_default) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b', 'U', true);
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url, active) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/b.ics', true),
  ('40000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Old', 'other', 'https://example.com/o.ics', false),
  ('40000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000b', 'Booking', 'booking', 'https://example.com/d.ics', true);
insert into public.occupancy (tenant_id, unit_id, nights, kind, label, ical_channel_id, ical_uid, is_blocking, conflict) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-01', '2030-01-04'), 'ical', 'B', '40000000-0000-0000-0000-00000000000a', 'e1', true, false),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-11', '2030-01-13'), 'ical', 'B', '40000000-0000-0000-0000-00000000000a', 'e2', false, true),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-20', '2030-01-22'), 'ical', 'O', '40000000-0000-0000-0000-00000000000b', 'e3', true, false),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000b', daterange('2030-01-01', '2030-01-04'), 'ical', 'B', '40000000-0000-0000-0000-00000000000c', 'e4', true, false);
insert into public.occupancy (tenant_id, unit_id, nights, kind, label) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-10', '2030-01-12'), 'block', 'Údržba');

set local role anon;
select is((select count(*)::int from public.unit_ical_busy_nights('30000000-0000-0000-0000-00000000000a', '2030-01-01', '2030-02-01')),
  2, 'iCal events of active channels, also the one in conflict');
select is((select count(*)::int from public.unit_ical_busy_nights('30000000-0000-0000-0000-00000000000a', '2030-01-01', '2030-02-01')
  where nights = daterange('2030-01-10', '2030-01-12')), 0, 'blocks of the application are not shown');
select is((select count(*)::int from public.unit_busy_nights('30000000-0000-0000-0000-00000000000a', '2030-01-01', '2030-02-01')),
  3, 'the usual calendar still shows the block');
select is((select count(*)::int from public.unit_ical_busy_nights('30000000-0000-0000-0000-00000000000b', '2030-01-01', '2030-02-01')),
  0, 'nothing for a property that is not published');

select * from finish();
rollback;
