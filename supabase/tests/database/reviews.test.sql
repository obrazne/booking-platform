-- Reviews (Z34): who may review (DB), RLS, moderation, automatic publication after 72 h, e-mails.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000d1', 'anna@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.guests (tenant_id, email, user_id, name) values
  ('10000000-0000-0000-0000-00000000000a', 'anna@test.local', '00000000-0000-0000-0000-0000000000d1', 'Anna Nováková');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temp table res (key text primary key, id uuid);
grant all on res to authenticated;

-- Reservations: create in the future, then move the stay into the past (as the stay already happened).
create function pg_temp.book(p_key text, p_email text, p_from integer, p_to integer, p_status text default 'confirmed')
returns void language plpgsql as $$
declare v_id uuid; v_base integer := 300 + 20 * (select count(*) from res)::int;
begin
  perform public.create_reservation(jsonb_build_object(
    'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
    'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna Nováková', 'guest_email', p_email,
    'adults', 2, 'currency', 'EUR', 'total_cents', 10000, 'status', 'confirmed',
    'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
      'unit_amount_cents', 10000, 'amount_cents', 10000)),
    'check_in', (current_date + v_base)::text, 'check_out', (current_date + v_base + 3)::text));
  select id into v_id from public.reservations
    where tenant_id = '10000000-0000-0000-0000-00000000000a' order by created_at desc, number desc limit 1;
  update public.reservation_items set check_in = current_date + p_from, check_out = current_date + p_to
    where reservation_id = v_id;
  if p_status <> 'confirmed' then
    update public.reservations set status = p_status where id = v_id;
  end if;
  insert into res values (p_key, v_id);
end $$;

select pg_temp.book('future', 'anna@test.local', 5, 8);
select is(public.review_eligibility((select id from res where key = 'future')), 'module_off',
  'without the module nobody reviews');
insert into public.tenant_modules (tenant_id, module_key, status)
  values ('10000000-0000-0000-0000-00000000000a', 'reviews', 'active');
select is(public.review_eligibility((select id from res where key = 'future')), 'not_departed',
  'before departure the stay cannot be reviewed');

select pg_temp.book('past', 'anna@test.local', -6, -3);
select pg_temp.book('old', 'anna@test.local', -45, -40);
select pg_temp.book('cancelled', 'anna@test.local', -12, -10, 'cancelled');
select is(public.review_eligibility((select id from res where key = 'past')), 'ok', 'after departure it can');
select is(public.review_eligibility((select id from res where key = 'old')), 'expired', 'only within 30 days');
select is(public.review_eligibility((select id from res where key = 'cancelled')), 'not_stayed',
  'not a cancelled reservation');

-- Owner cannot write a review for the guest.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.submit_review((select id from res where key = 'past'), 5) $$, '42501', null,
  'only the guest of the reservation submits');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is(public.my_review_eligibility((select id from res where key = 'past')), 'ok', 'the guest sees they may review');
select lives_ok($$ select public.submit_review((select id from res where key = 'past'), 4,
  '{"cleanliness": 5}'::jsonb, 'Krásny pobyt.') $$, 'the guest submits the review');
select throws_ok($$ select public.submit_review((select id from res where key = 'past'), 5) $$, 'P0001', 'exists',
  'one review per reservation');
select throws_ok($$ select public.submit_review((select id from res where key = 'old'), 5) $$, 'P0001', 'expired',
  'the window is checked in the database');
select is((select display_name from public.reviews), 'Anna N.', 'first name and initial by default');
reset role;

select is((select count(*)::int from public.notifications where kind = 'review_new'
  and tenant_id = '10000000-0000-0000-0000-00000000000a'), 1, 'the team gets a notification');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.reviews), 0, 'another client does not see it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.reviews), 1, 'the owner sees it');
select throws_ok($$ update public.reviews set body = 'Upravené' $$, '42501', null,
  'the owner never edits what the guest wrote');
select throws_ok($$ update public.reviews set status = 'rejected' $$, '23514', null,
  'rejection needs a reason');
reset role;

set local role anon;
select is((select count(*)::int from public.public_reviews('10000000-0000-0000-0000-00000000000a')), 0,
  'not public before publication');
reset role;

-- 72 hours pass.
update public.reviews set submitted_at = now() - interval '73 hours';
select public.reviews_tick();
select is((select status from public.reviews), 'published', 'published automatically after 72 hours');
set local role anon;
select is((select count from public.review_summary('10000000-0000-0000-0000-00000000000a'))::text || ' / '
  || (select average from public.review_summary('10000000-0000-0000-0000-00000000000a'))::text, '1 / 4.0',
  'the average counts published reviews');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update public.reviews set status = 'rejected', reject_reason = 'spam';
reset role;
select is((select count(*)::int from public.email_outbox where kind = 'guest_review_rejected'
  and reservation_id = (select id from res where key = 'past')), 1, 'the guest is told about the rejection');

-- Invitation the day after departure.
select pg_temp.book('yesterday', 'anna@test.local', -4, -1);
update public.reservation_items set check_out = (now() at time zone 'Europe/Bratislava')::date - 1
  where reservation_id = (select id from res where key = 'yesterday');
update public.tenants set timezone = 'Europe/Bratislava' where id = '10000000-0000-0000-0000-00000000000a';
select public.reviews_tick();
select is((select count(*)::int from public.email_outbox where kind = 'guest_review_invite'
  and reservation_id = (select id from res where key = 'yesterday')), 1, 'invitation the day after departure');
select public.reviews_tick();
select is((select count(*)::int from public.email_outbox where kind = 'guest_review_invite'
  and reservation_id = (select id from res where key = 'yesterday')), 1, 'only once');

select * from finish();
rollback;
