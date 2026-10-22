-- Z78: gift vouchers — made only by the team (code not guessable), a reservation pays with it up to the price (the
-- rest by transfer, all → confirmed), the balance goes down, a cancellation returns it; unusable vouchers are refused;
-- another client sees nothing.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'chalet-stromy', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temporary table base on commit drop as select jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'adults', 2, 'currency', 'EUR',
  'total_cents', 50000, 'status', 'pending_payment', 'source', 'direct',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2,
    'unit_amount_cents', 25000, 'amount_cents', 50000))) as p;

-- Only the team makes vouchers; the code is the client's prefix + 8 random characters.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok($$select public.gift_voucher_create('10000000-0000-0000-0000-00000000000a', 10000)$$,
  '42501', null, 'another client cannot make a voucher of this one');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
-- (in FROM: called once; "(f()).*" would call it once per column)
create temporary table v as
  select * from public.gift_voucher_create('10000000-0000-0000-0000-00000000000a', 20000, 'Jana', current_date + 30, 'súťaž');
create temporary table w as
  select * from public.gift_voucher_create('10000000-0000-0000-0000-00000000000a', 80000);
select matches((select code from v), '^CHALETST-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$', 'a code that cannot be guessed');
select is((select balance_cents from v), 20000, 'the balance starts at the value');
select throws_ok($$insert into public.gift_vouchers (tenant_id, code, amount_cents, balance_cents)
  values ('10000000-0000-0000-0000-00000000000a', 'X-AAAA-AAAA', 100, 100)$$,
  '42501', null, 'no voucher without gift_voucher_create (no own codes, no balance by hand)');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.gift_vouchers), 0, 'another client sees no vouchers');
reset role;

-- 200 € of 500 €: the voucher received, the rest by transfer, the balance 0.
select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'cast@test.local', 'check_in', '2031-03-10', 'check_out', '2031-03-12',
  'gift_voucher', jsonb_build_object('code', lower((select code from v)))));
select is((select status from public.reservations where guest_email = 'cast@test.local'), 'pending_payment',
  'part paid by the voucher → the rest waits for the payment');
select is((select array_agg(provider || ':' || status || ':' || amount_cents order by provider) from public.payments
           where reservation_id = (select id from public.reservations where guest_email = 'cast@test.local')),
  array['bank_transfer:pending:30000', 'gift_voucher:received:20000'], 'the voucher pays 200 €, 300 € by transfer');
select is((select balance_cents from public.gift_vouchers where id = (select id from v)), 0, 'the voucher is used up');

-- Used up → refused.
select throws_ok($$select public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'znova@test.local', 'check_in', '2031-04-10', 'check_out', '2031-04-12',
  'gift_voucher', jsonb_build_object('code', (select code from v))))$$,
  'P0002', null, 'a used-up voucher is refused');

-- 800 € for 500 €: all paid → confirmed, 300 € stay on the voucher.
select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'cely@test.local', 'check_in', '2031-05-10', 'check_out', '2031-05-12',
  'gift_voucher', jsonb_build_object('code', (select code from w))));
select is((select status from public.reservations where guest_email = 'cely@test.local'), 'confirmed',
  'the voucher covers all → confirmed at once');
select is((select balance_cents from public.gift_vouchers where id = (select id from w)), 30000,
  'what is not used stays on the voucher');
select ok(exists (select 1 from public.email_outbox e join public.reservations r on r.id = e.reservation_id
                  where r.guest_email = 'cely@test.local' and e.kind = 'guest_confirmed'), 'the guest gets the confirmation');

-- A cancelled reservation returns the voucher.
update public.reservations set status = 'cancelled' where guest_email = 'cast@test.local';
select is((select balance_cents from public.gift_vouchers where id = (select id from v)), 20000,
  'cancelled → the amount is back on the voucher');

-- Cancelled or expired vouchers are refused.
update public.gift_vouchers set valid_until = current_date - 1 where id = (select id from w);
select throws_ok($$select public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'po@test.local', 'check_in', '2031-06-10', 'check_out', '2031-06-12',
  'gift_voucher', jsonb_build_object('code', (select code from w))))$$,
  'P0002', null, 'an expired voucher is refused');

select * from finish();
rollback;
