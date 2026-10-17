-- Online check-in for guests (Z39): the guest sees the sensitive fields only masked, saving again keeps them (and
-- the report of a foreigner), a completed check-in can be changed until the day of arrival and is completed again.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

insert into public.tenants (id, slug, name, timezone) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'Europe/Bratislava');
insert into public.tenant_modules (tenant_id, module_key, status)
  values ('10000000-0000-0000-0000-00000000000a', 'checkin', 'active');
insert into public.properties (id, tenant_id, slug, name, status, checkin_required_for_instructions) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published', true);
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temp table t (token text, id uuid);
grant all on t to anon, authenticated;
insert into t (token, id)
select c.access_token, c.id from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 30000, 'status', 'confirmed',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 30000, 'amount_cents', 30000)),
  'check_in', (current_date + 2)::text, 'check_out', (current_date + 5)::text)) c;

select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select public.guest_checkin_view((select id from t), 'wrong') $$, '42501', null,
  'a wrong token sees nothing');
select is(public.guest_checkin_view((select id from t), (select token from t)) ->> 'status', 'not_started',
  'nothing filled yet');
select lives_ok($$ select public.save_checkin((select id from t), jsonb_build_object(
  'arrival_time', '16:00', 'house_rules_accepted', true,
  'guests', jsonb_build_array(
    jsonb_build_object('first_name', 'Anna', 'last_name', 'Nová', 'is_citizen', true, 'document_type', 'id_card',
      'document_number', 'EA 123456', 'address', 'Hlavná 1, Poprad'),
    jsonb_build_object('first_name', 'John', 'last_name', 'Smith', 'is_citizen', false, 'nationality', 'GB',
      'birth_date', '1980-05-01', 'document_type', 'passport', 'document_number', '123456789',
      'address', '1 High St, London'))),
  (select token from t)) $$, 'the guest saves');
select lives_ok($$ select public.complete_checkin((select id from t), (select token from t)) $$, 'and completes');
select is(public.guest_checkin_view((select id from t), (select token from t)) -> 'persons' -> 1 ->> 'document_masked',
  '••••89', 'the document number comes back masked');
select ok(not (public.guest_checkin_view((select id from t), (select token from t))::text like '%123456789%')
  and not (public.guest_checkin_view((select id from t), (select token from t))::text like '%1980-05-01%'),
  'neither the document number nor the date of birth leaves the database');
reset role;

-- The owner reported the foreigner; the guest then fixes a name without retyping the sensitive fields.
update public.checkin_guests set reported_at = now() where last_name = 'Smith';
create temp table ids as select id, sort from public.checkin_guests where reservation_id = (select id from t);
grant select on ids to anon;
set local role anon;
select lives_ok($$ select public.save_checkin((select id from t), jsonb_build_object(
  'arrival_time', '17:00', 'house_rules_accepted', true,
  'guests', jsonb_build_array(
    jsonb_build_object('id', (select id from ids where sort = 0), 'first_name', 'Anna', 'last_name', 'Nováková',
      'is_citizen', true, 'document_type', 'id_card', 'address', 'Hlavná 1, Poprad'),
    jsonb_build_object('id', (select id from ids where sort = 1), 'first_name', 'John', 'last_name', 'Smith',
      'is_citizen', false, 'nationality', 'GB', 'document_type', 'passport', 'address', '1 High St, London'))),
  (select token from t)) $$, 'a completed check-in can be changed before arrival');
reset role;
select is((select string_agg(document_number, ',' order by sort) from public.checkin_guests
  where reservation_id = (select id from t)), 'EA123456,123456789', 'the document numbers are kept');
select ok((select birth_date = '1980-05-01' and reported_at is not null from public.checkin_guests
  where last_name = 'Smith'), 'the date of birth and the report are kept');
select is((select status from public.checkins where reservation_id = (select id from t)), 'in_progress',
  'the change reopens the check-in');
set local role anon;
select lives_ok($$ select public.complete_checkin((select id from t), (select token from t)) $$,
  'and it is completed again');
reset role;

select * from finish();
rollback;
