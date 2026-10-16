-- Guest page v2 (Z19): testimonials, hidden address for approximate location, nearby places, templates.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status, street, latitude, longitude, location_mode) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published', 'Tajná 1', 48.996123, 19.583456, 'approximate'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'pa2', 'PA2', 'published', 'Verejná 2', 48.1, 17.1, 'exact');

insert into public.testimonials (tenant_id, property_id, body, author_name, published) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '{"sk":"Super"}', 'Anna K.', true),
  ('10000000-0000-0000-0000-00000000000a', null, '{"sk":"Skryté"}', 'Boris', false);
insert into public.testimonials (tenant_id, body, author_name, featured)
select '10000000-0000-0000-0000-00000000000a', '{"sk":"x"}', 'Hosť ' || g, true from generate_series(1, 5) g;
select throws_ok($$ insert into public.testimonials (tenant_id, body, author_name, featured)
  values ('10000000-0000-0000-0000-00000000000a', '{"sk":"y"}', 'Šiesty', true) $$, '23514', null,
  'at most 5 featured testimonials');
select throws_ok($$ insert into public.testimonials (tenant_id, property_id, body, author_name)
  values ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000a', '{"sk":"y"}', 'Cudzí') $$, '23514', null,
  'testimonial cannot point to a property of another tenant');
insert into public.property_places (tenant_id, property_id, name, distance) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '{"sk":"Jasná"}', '7 km');

set local role anon;
select is((select count(*)::int from public.testimonials where author_name in ('Anna K.', 'Boris')), 1,
  'guest sees published testimonials only');
select throws_ok($$ select street from public.properties $$, '42501', null, 'guest cannot read the street directly');
select is((select latitude from public.property_public_location('20000000-0000-0000-0000-00000000000a')), 49.00::numeric,
  'approximate location is rounded');
select ok((select street is null and approximate from public.property_public_location('20000000-0000-0000-0000-00000000000a')),
  'approximate location hides the street');
select is((select street from public.property_public_location('20000000-0000-0000-0000-0000000000a2')), 'Verejná 2',
  'exact location shows the street');
select is((select count(*)::int from public.property_places where property_id = '20000000-0000-0000-0000-00000000000a'), 1, 'guest sees nearby places of a published property');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
update public.testimonials set author_name = 'Hacked' where tenant_id = '10000000-0000-0000-0000-00000000000a';
reset role;
select is((select count(*)::int from public.testimonials where author_name = 'Hacked'), 0,
  'owner of another tenant cannot change testimonials');

select is((select types[1] from public.section_templates where key = 'whole'), 'intro', 'v2 template starts with the intro');
select ok((select 'location' = any (types) and 'inside' = any (types) from public.section_templates where key = 'whole'),
  'v2 template has surroundings and inside view');

select * from finish();
rollback;
