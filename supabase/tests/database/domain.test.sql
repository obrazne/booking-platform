-- Domain: tenant isolation, guest visibility, and the database refusing double bookings (B2).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

-- Fixtures -----------------------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a3', 'clean-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'cleaning'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');

insert into public.properties (id, tenant_id, slug, name, status, max_guests, cleaning_gap_days) values
  ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000b', 'draft-b', 'Draft B', 'draft', 2, 0),
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'chalet-a', 'Chalet A', 'published', 8, 0),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'draft-a', 'Draft A', 'draft', 4, 1),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'chalet-b', 'Chalet B', 'published', 6, 0);
insert into public.property_private (property_id, tenant_id, arrival_instructions) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '{"sk":"Kód dverí 1234"}');
insert into public.units (id, tenant_id, property_id, name, max_guests, is_default) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Celý', 8, true),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2', 'Celý', 4, true),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Celý', 6, true);
insert into public.discounts (tenant_id, property_id, kind, name, code, percent_bp) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'promo', '{"sk":"Promo"}', 'SECRET15', 1500);
insert into public.discounts (tenant_id, property_id, kind, name, min_nights, percent_bp) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'length_of_stay', '{"sk":"Týždeň"}', 6, 1000);

-- Reservation helper payload
create temporary table r_payload as select jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'check_in', '2027-01-10', 'check_out', '2027-01-13',
  'guest_name', 'Ján Hosť', 'guest_email', 'Jan@Example.com', 'adults', 2, 'currency', 'EUR', 'total_cents', 255000,
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', '3 noci', 'quantity', 3,
    'unit_amount_cents', 85000, 'amount_cents', 255000)),
  'consents', jsonb_build_array(jsonb_build_object('kind', 'terms', 'version', 'v1', 'text', 'Súhlasím', 'granted', true))
) as p;
grant select on r_payload to service_role;

-- Creating reservations (service role) ------------------------------------------------------------
set local role service_role;
select lives_ok($$ select * from public.create_reservation((select p from r_payload)) $$, 'first reservation is created');
select is((select number from public.reservations order by number limit 1), extract(year from now())::text || '-0001',
  'number follows the tenant series');
select is((select guest_email from public.reservations limit 1), 'jan@example.com', 'e-mail stored lowercase');
select is((select status from public.reservations limit 1), 'pending_payment', 'new reservation waits for payment');
select ok((select payment_due_at > now() + interval '23 hours' from public.reservations limit 1), 'default 24 h deadline');

select throws_ok($$ select * from public.create_reservation((select p || '{"check_in":"2027-01-12","check_out":"2027-01-15"}' from r_payload)) $$,
  '23P01', null, 'overlapping reservation is refused by the database');
select lives_ok($$ select * from public.create_reservation((select p || '{"check_in":"2027-01-13","check_out":"2027-01-15","total_cents":170000,"lines":[{"kind":"accommodation","label":"2 noci","quantity":2,"unit_amount_cents":85000,"amount_cents":170000}]}' from r_payload)) $$,
  'back-to-back stay (check-out = next check-in) is allowed');
select throws_ok($$ select * from public.create_reservation((select p || '{"total_cents":1}' from r_payload)) $$,
  '22023', null, 'total must equal the lines');
select throws_ok($$ select * from public.create_reservation((select p || '{"adults":9}' from r_payload)) $$,
  '22023', null, 'capacity is enforced');
select throws_ok($$ select * from public.create_reservation((select p || '{"unit_id":"30000000-0000-0000-0000-00000000000b"}' from r_payload)) $$,
  '22023', null, 'unit of another tenant is refused');

-- Holds: a hold blocks; it can be converted into the guest's reservation.
select lives_ok($$ select public.create_hold('30000000-0000-0000-0000-00000000000a', '2027-02-01', '2027-02-04') $$, 'hold created');
select throws_ok($$ select public.create_hold('30000000-0000-0000-0000-00000000000a', '2027-02-02', '2027-02-03') $$,
  '23P01', null, 'second hold on the same nights is refused');
select lives_ok($$ select * from public.create_reservation((select p || jsonb_build_object('check_in','2027-02-01','check_out','2027-02-04',
  'hold_id', (select id from public.occupancy where kind = 'hold' limit 1)) from r_payload)) $$, 'hold becomes a reservation');

-- Cleaning gap extends the blocked range of the draft property (gap = 1 day).
select lives_ok($$ select * from public.create_reservation((select p || '{"property_id":"20000000-0000-0000-0000-0000000000a2","unit_id":"30000000-0000-0000-0000-0000000000a2","check_in":"2027-03-01","check_out":"2027-03-03","total_cents":0,"lines":[]}' from r_payload)) $$,
  'reservation on the second property');
select throws_ok($$ select * from public.create_reservation((select p || '{"property_id":"20000000-0000-0000-0000-0000000000a2","unit_id":"30000000-0000-0000-0000-0000000000a2","check_in":"2027-03-03","check_out":"2027-03-05","total_cents":0,"lines":[]}' from r_payload)) $$,
  '23P01', null, 'cleaning day after a stay is blocked');

-- iCal collision is stored as a non-blocking conflict, never overwriting a reservation.
insert into public.ical_channels (id, tenant_id, unit_id, name, source, import_url) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Booking', 'booking', 'https://example.com/a.ics');
select throws_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2027-01-11','2027-01-12'), 'ical',
          '40000000-0000-0000-0000-00000000000a', 'x1') $$, '23P01', null, 'blocking iCal event cannot overlap a reservation');
select lives_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, is_blocking, conflict)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2027-01-11','2027-01-12'), 'ical',
          '40000000-0000-0000-0000-00000000000a', 'x1', false, true) $$, 'collision kept as a conflict');

-- Owner of tenant A ---------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq($$ select slug from public.properties where status = 'draft' or tenant_id = '10000000-0000-0000-0000-00000000000a' order by slug $$,
  array['chalet-a', 'draft-a'], 'owner A sees own properties incl. drafts; of tenant B only what is published');
select is((select count(*)::int from public.reservations), 4, 'owner A sees own reservations');
select is((select count(*)::int from public.property_private), 1, 'owner A reads arrival instructions');
select throws_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, label)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2027-01-12','2027-01-14'), 'block', 'Údržba') $$,
  '23P01', null, 'owner block cannot overlap a reservation');
select lives_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, label)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2027-04-01','2027-04-05'), 'block', 'Údržba') $$,
  'owner blocks a free term');
select throws_ok($$ insert into public.occupancy (tenant_id, unit_id, nights, kind, reservation_id)
  values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', daterange('2027-05-01','2027-05-05'), 'reservation',
          (select id from public.reservations limit 1)) $$, '42501', null, 'staff cannot write reservation occupancy directly');
select lives_ok($$ select public.confirm_payment((select id from public.reservations order by number limit 1)) $$,
  'owner confirms a payment');
select is((select status from public.reservations order by number limit 1), 'confirmed', 'reservation confirmed');
select lives_ok($$ select public.cancel_reservation((select id from public.reservations order by number limit 1), 'test') $$,
  'owner cancels');
select ok(not (select is_blocking from public.occupancy where reservation_id = (select id from public.reservations order by number limit 1)),
  'cancelled reservation releases the term');

-- Cleaning role and owner B ----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select is((select count(*)::int from public.reservations), 0, 'cleaning sees no reservations');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.reservations), 0, 'owner B sees none of tenant A reservations');

-- Guest (anon) -------------------------------------------------------------------------------------
reset request.jwt.claims;
set local role anon;
select results_eq($$ select slug from public.properties where tenant_id in ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b') order by slug $$, array['chalet-a', 'chalet-b'],
  'guest sees only published properties');
select is((select count(*)::int from public.discounts where tenant_id = '10000000-0000-0000-0000-00000000000a'), 1, 'guest sees the stay discount but not the promo code');

select lives_ok('select count(*) from public.terms', 'guest reads catalogue terms');

select * from finish();
rollback;
