-- Collisions (Z42): the team marks a collision as resolved (audit, the bell notification goes away, the channel is
-- no longer "kolízia"), another client cannot, the next sync keeps it resolved while the dates stay, a change of
-- the dates opens it again (and rings again).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'p', 'P', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true);
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/b.ics');
insert into public.occupancy (tenant_id, unit_id, nights, kind, label) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2030-01-10', '2030-01-12'), 'block', 'Údržba');

select is(jsonb_array_length(public.ical_apply('40000000-0000-0000-0000-00000000000a',
  '[{"uid":"e2","start":"2030-01-11","end":"2030-01-13","summary":"CLOSED - Not available"}]') -> 'conflicts'), 1,
  'the colliding event is a collision');
create temp table c as select id from public.occupancy where ical_uid = 'e2';
grant select on c to authenticated;
select ok((select conflict_detected_at is not null and conflict_resolved_at is null from public.occupancy
  where id = (select id from c)), 'detected, open');
select is((select target from public.notifications where kind = 'calendar_conflict'),
  '/admin/collisions?panel=collision:' || (select id from c), 'the bell opens the panel of the collision');
select ok((select payload -> 'conflicts' -> 0 ->> 'id' = (select id from c)::text from public.email_outbox
  where kind = 'owner_ical_conflict'), 'the e-mail knows which collision');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$ select public.resolve_conflict((select id from c)) $$, '42501', null,
  'another client cannot resolve it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ select public.resolve_conflict((select id from c)) $$, 'the owner resolves it');
reset role;
select ok((select conflict_resolved_at is not null and conflict_resolved_by = '00000000-0000-0000-0000-0000000000a1'
  from public.occupancy where id = (select id from c)), 'resolved, by whom');
select is((select count(*)::int from public.notifications where kind = 'calendar_conflict'), 0,
  'the bell notification is gone');
select is((select last_status from public.ical_channels), 'ok', 'the channel is no longer "kolízia"');
select is((select count(*)::int from public.audit_log where action = 'conflict.resolved'), 1, 'written into the audit');

-- Next sync, same dates: stays resolved.
select public.ical_apply('40000000-0000-0000-0000-00000000000a',
  '[{"uid":"e2","start":"2030-01-11","end":"2030-01-13","summary":"CLOSED - Not available"}]');
select ok((select conflict_resolved_at is not null from public.occupancy where id = (select id from c))
  and (select last_status from public.ical_channels) = 'ok', 'an unchanged event keeps the resolution');

-- The dates change on the portal: open again and the bell rings again.
select public.ical_apply('40000000-0000-0000-0000-00000000000a',
  '[{"uid":"e2","start":"2030-01-11","end":"2030-01-14","summary":"CLOSED - Not available"}]');
select ok((select conflict and conflict_resolved_at is null from public.occupancy where id = (select id from c))
  and (select last_status from public.ical_channels) = 'conflict', 'a change of the dates opens it again');
select is((select count(*)::int from public.notifications where kind = 'calendar_conflict'), 1, 'and rings again');

select * from finish();
rollback;
