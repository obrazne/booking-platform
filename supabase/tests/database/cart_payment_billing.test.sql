-- Z71: the reservation keeps the way to pay chosen in the cart and the company for an invoice; an incomplete company
-- is refused; without them a reservation is a bank transfer for a person, as before.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

insert into public.tenants (id, slug, name, status) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temporary table base on commit drop as select jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'adults', 2, 'currency', 'EUR',
  'total_cents', 20000, 'status', 'pending_payment', 'source', 'direct',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2,
    'unit_amount_cents', 10000, 'amount_cents', 20000))) as p;

select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'firma@test.local', 'check_in', '2031-03-10', 'check_out', '2031-03-12',
  'payment_method', 'bank_transfer',
  'billing', jsonb_build_object('company', 'Firma s.r.o.', 'company_id', '12345678', 'tax_id', '2020123456',
    'vat_id', '', 'address', 'Hlavná 1, Bratislava')));
select is((select array[billing_company, billing_company_id, billing_tax_id, coalesce(billing_vat_id, '-'), billing_address]
           from public.reservations where guest_email = 'firma@test.local'),
  array['Firma s.r.o.', '12345678', '2020123456', '-', 'Hlavná 1, Bratislava'], 'the company is kept (an empty IČ DPH is none)');
select is((select payment_method from public.reservations where guest_email = 'firma@test.local'), 'bank_transfer',
  'the way to pay is kept');

select null from public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'osoba@test.local', 'check_in', '2031-04-10', 'check_out', '2031-04-12'));
select is((select array[payment_method, coalesce(billing_company, '-')] from public.reservations
           where guest_email = 'osoba@test.local'), array['bank_transfer', '-'], 'without them: a transfer for a person');

select throws_ok($$select public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'neuplna@test.local', 'check_in', '2031-05-10', 'check_out', '2031-05-12',
  'billing', jsonb_build_object('company', 'Firma bez IČO')))$$,
  '23514', null, 'a company without IČO and address is refused');
select throws_ok($$select public.create_reservation((select p from base) || jsonb_build_object(
  'guest_email', 'zla@test.local', 'check_in', '2031-06-10', 'check_out', '2031-06-12', 'payment_method', 'cash'))$$,
  '23514', null, 'an unknown way to pay is refused');

select * from finish();
rollback;
