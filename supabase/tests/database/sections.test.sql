-- Property page sections (B7): template on creation, mandatory calendar, guest sees only published, owners write own tenant.
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
insert into public.properties (id, tenant_id, slug, name, status, booking_mode) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published', 'whole'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'pa2', 'PA2', 'draft', 'units');

select is((select array_agg(type order by sort) from public.property_sections
           where property_id = '20000000-0000-0000-0000-00000000000a'),
          (select types from public.section_templates where key = 'whole'), 'new whole property gets the "whole" template');
select ok((select bool_and(tenant_id = '10000000-0000-0000-0000-00000000000a') from public.property_sections
           where property_id = '20000000-0000-0000-0000-0000000000a2')
          and exists (select 1 from public.property_sections where property_id = '20000000-0000-0000-0000-0000000000a2' and type = 'units'),
          'property with units gets a template with units');
select is(public.apply_section_template('20000000-0000-0000-0000-00000000000a'), null, 'existing sections are not overwritten');
select is(public.apply_section_template('20000000-0000-0000-0000-00000000000a', 'glamping', true), 'glamping', 'replace with another template');

select throws_ok($$ update public.property_sections set enabled = false where type = 'calendar' $$, '23514', null,
  'the calendar cannot be switched off');
select throws_ok($$ insert into public.property_sections (tenant_id, property_id, type)
                    values ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000a', 'faq') $$,
  '23514', null, 'section tenant must match the property');

set local role anon;
select ok((select count(*) from public.property_sections where property_id = '20000000-0000-0000-0000-00000000000a') > 0,
  'guest reads sections of a published property');
select is((select count(*)::int from public.property_sections where property_id = '20000000-0000-0000-0000-0000000000a2'), 0,
  'guest does not see sections of a draft');
select throws_ok($$ select public.apply_section_template('20000000-0000-0000-0000-00000000000a', 'whole', true) $$, '42501', null,
  'guest cannot apply templates');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
update public.property_sections set content = '{"title":{"sk":"x"}}' where property_id = '20000000-0000-0000-0000-00000000000a';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.property_sections
           where property_id = '20000000-0000-0000-0000-00000000000a' and content ? 'title'), 0,
  'owner of another tenant cannot change sections');
update public.property_sections set content = '{"title":{"sk":"Ahoj"}}'
  where property_id = '20000000-0000-0000-0000-00000000000a' and type = 'faq';
select is((select content #>> '{title,sk}' from public.property_sections
           where property_id = '20000000-0000-0000-0000-00000000000a' and type = 'faq'), 'Ahoj', 'owner edits own sections');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$ select public.owner_reset_sections('20000000-0000-0000-0000-00000000000a', 'whole') $$, '42501', null,
  'owner of another tenant cannot reset sections');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.owner_reset_sections('20000000-0000-0000-0000-00000000000a', 'rooms'), 'rooms', 'owner resets own page to a template');

select * from finish();
rollback;
