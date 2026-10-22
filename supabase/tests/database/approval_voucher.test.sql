-- Z77: reservations on approval and the recreation voucher — a direct booking of a property "na schválenie" (or paid by
-- a voucher) waits for the owner 48 h, e-mails and the bell; approval → payment details (or confirmed when the voucher
-- covers all), decline, reminder after 24 h and cancellation after the deadline; another client cannot approve.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.tenant_settings (tenant_id, iban, payment_due_hours, voucher_enabled) values
  ('10000000-0000-0000-0000-00000000000a', 'SK3112000000198742637541', 24, true)
  on conflict (tenant_id) do update set iban = excluded.iban, payment_due_hours = 24, voucher_enabled = true;
insert into public.properties (id, tenant_id, slug, name, status, booking_approval) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'schvalenie', 'Na schválenie', 'published', 'approval'),
  ('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', 'okamzite', 'Okamžite', 'published', 'instant');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6),
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000c', 'U', true, 6);

create temporary table base on commit drop as select jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'adults', 2, 'currency', 'EUR',
  'total_cents', 50000, 'status', 'pending_payment', 'source', 'direct',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2,
    'unit_amount_cents', 25000, 'amount_cents', 50000))) as p;
create temporary table approval_unit on commit drop as select jsonb_build_object(
  'property_id', '20000000-0000-0000-0000-00000000000a', 'unit_id', '30000000-0000-0000-0000-00000000000a') as p;
create temporary table instant_unit on commit drop as select jsonb_build_object(
  'property_id', '20000000-0000-0000-0000-00000000000c', 'unit_id', '30000000-0000-0000-0000-00000000000c') as p;

-- A property "na schválenie": the term is held, no payment deadline yet.
select null from public.create_reservation((select p from base) || (select p from approval_unit) || jsonb_build_object(
  'guest_email', 'schvalit@test.local', 'check_in', '2031-03-10', 'check_out', '2031-03-12'));
select is((select status from public.reservations where guest_email = 'schvalit@test.local'), 'awaiting_approval',
  'a direct booking of a property on approval waits for the owner');
select ok((select approval_due_at between now() + interval '47 hours' and now() + interval '49 hours'
                  and payment_due_at is null
           from public.reservations where guest_email = 'schvalit@test.local'), '48 h to approve, no payment deadline yet');
select is((select array_agg(kind order by kind) from public.email_outbox where reservation_id = (select id from public.reservations where guest_email = 'schvalit@test.local')),
  array['guest_awaiting_approval', 'owner_approval_request'], 'guest: waiting; owner: please approve (no payment details)');
select is((select count(*)::int from public.notifications where kind = 'approval_request'
           and target like '%' || (select id from public.reservations where guest_email = 'schvalit@test.local')), 1, 'bell (and push) for the owner');
select ok((select is_blocking from public.occupancy where reservation_id = (select id from public.reservations where guest_email = 'schvalit@test.local')),
  'the term is held');

-- A reservation entered by hand is not on approval.
select null from public.create_reservation((select p from base) || (select p from approval_unit) || jsonb_build_object(
  'guest_email', 'rucna@test.local', 'check_in', '2031-04-10', 'check_out', '2031-04-12', 'source', 'manual'));
select is((select status from public.reservations where guest_email = 'rucna@test.local'), 'pending_payment',
  'a manual reservation skips the approval');

-- Another client cannot approve.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok(format('select public.approve_reservation(%L)', (select id from public.reservations where guest_email = 'schvalit@test.local')),
  '42501', null, 'another client cannot approve');

-- The owner approves: the payment deadline starts now, the guest gets the payment details.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.approve_reservation((select id from public.reservations where guest_email = 'schvalit@test.local')), 'pending_payment', 'approved → waiting for payment');
reset role;
select ok((select payment_due_at between now() + interval '23 hours' and now() + interval '25 hours'
                  and approval_due_at is null and approved_by is not null
           from public.reservations where guest_email = 'schvalit@test.local'), 'the deadline of the payment starts at the approval');
select ok(exists (select 1 from public.email_outbox where reservation_id = (select id from public.reservations where guest_email = 'schvalit@test.local')
                  and kind = 'guest_approved'), 'the guest gets the payment details (guest_approved)');

-- A recreation voucher goes on approval also on an instant property.
select null from public.create_reservation((select p from base) || (select p from instant_unit) || jsonb_build_object(
  'guest_email', 'poukaz@test.local', 'check_in', '2031-05-10', 'check_out', '2031-05-12',
  'payment_method', 'recreation_voucher', 'voucher', jsonb_build_object('number', 'RP-123', 'issuer', 'Firma Benefit')));
select is((select array[status, voucher_number, voucher_issuer] from public.reservations where guest_email = 'poukaz@test.local'),
  array['awaiting_approval', 'RP-123', 'Firma Benefit'], 'a voucher always waits for the owner, with its number and issuer');
select throws_ok($$select public.create_reservation((select p from base) || (select p from instant_unit) || jsonb_build_object(
  'guest_email', 'bez@test.local', 'check_in', '2031-06-10', 'check_out', '2031-06-12', 'payment_method', 'recreation_voucher'))$$,
  '23514', null, 'a voucher without its number is refused');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(format('select public.approve_reservation(%L)', (select id from public.reservations where guest_email = 'poukaz@test.local')),
  '22023', null, 'a voucher needs its amount at the approval');
select is(public.approve_reservation((select id from public.reservations where guest_email = 'poukaz@test.local'), jsonb_build_object(
  'amount_cents', 30000, 'company', 'Zamestnávateľ a.s.', 'company_id', '87654321', 'tax_id', '2021000000',
  'vat_id', '', 'address', 'Priemyselná 2, Žilina')), 'pending_payment', 'voucher 300 € of 500 € → the rest by transfer');
reset role;
select is((select array_agg(provider || ':' || status || ':' || amount_cents order by provider) from public.payments
           where reservation_id = (select id from public.reservations where guest_email = 'poukaz@test.local')),
  array['bank_transfer:pending:20000', 'recreation_voucher:received:30000'], 'the voucher received, the rest to pay');
select is((select array[voucher_company, voucher_company_id, coalesce(voucher_vat_id, '-')] from public.reservations
           where guest_email = 'poukaz@test.local'), array['Zamestnávateľ a.s.', '87654321', '-'], 'the company of the voucher');

-- A voucher covering everything confirms at once.
select null from public.create_reservation((select p from base) || (select p from instant_unit) || jsonb_build_object(
  'guest_email', 'cely@test.local', 'check_in', '2031-07-10', 'check_out', '2031-07-12',
  'payment_method', 'recreation_voucher', 'voucher', jsonb_build_object('number', 'RP-9', 'issuer', 'X')));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.approve_reservation((select id from public.reservations where guest_email = 'cely@test.local'), jsonb_build_object(
  'amount_cents', 50000, 'company', 'Firma', 'company_id', '1', 'address', 'Adresa 1')), 'confirmed',
  'the voucher covers all → confirmed');

-- Decline: the term is released, the guest gets an e-mail with the reason.
reset role;
select null from public.create_reservation((select p from base) || (select p from approval_unit) || jsonb_build_object(
  'guest_email', 'zamietnut@test.local', 'check_in', '2031-08-10', 'check_out', '2031-08-12'));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(format('select public.decline_reservation(%L, %L)', (select id from public.reservations where guest_email = 'zamietnut@test.local'), 'obsadené súkromne'),
  'the owner declines');
reset role;
select is((select array[r.status, r.cancelled_reason, (select payload ->> 'reason' from public.email_outbox e
             where e.reservation_id = r.id and e.kind = 'guest_cancelled')]
           from public.reservations r where r.guest_email = 'zamietnut@test.local'),
  array['cancelled', 'approval_declined', 'approval_declined'], 'declined → cancelled, e-mail to the guest');

-- After 24 h a reminder, after 48 h cancelled (the cron job of the payment deadlines).
select null from public.create_reservation((select p from base) || (select p from approval_unit) || jsonb_build_object(
  'guest_email', 'pripomenut@test.local', 'check_in', '2031-09-10', 'check_out', '2031-09-12'));
select null from public.create_reservation((select p from base) || (select p from approval_unit) || jsonb_build_object(
  'guest_email', 'vyprsat@test.local', 'check_in', '2031-10-10', 'check_out', '2031-10-12'));
update public.reservations set approval_due_at = now() + interval '20 hours' where guest_email = 'pripomenut@test.local';
update public.reservations set approval_due_at = now() - interval '1 minute' where guest_email = 'vyprsat@test.local';
select null from public.expire_pending_reservations();
select ok(exists (select 1 from public.email_outbox where reservation_id = (select id from public.reservations where guest_email = 'pripomenut@test.local')
                  and kind = 'owner_approval_reminder')
          and exists (select 1 from public.notifications where kind = 'approval_request'
                      and data ->> 'reminder' = 'true' and target like '%' || (select id from public.reservations where guest_email = 'pripomenut@test.local')),
  'after 24 h a reminder (e-mail, bell)');
select is((select array[status, cancelled_reason] from public.reservations where guest_email = 'vyprsat@test.local'),
  array['cancelled', 'approval_expired'], 'not approved in 48 h → cancelled');

select * from finish();
rollback;
