-- Z75: the saved commission as the budget for own marketing — the spend per month (owner writes, the team reads,
-- another client nothing), the sums since the first month and the history of the change.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'reception-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'reception'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.tenant_settings (tenant_id, portal_commission_bp) values
  ('10000000-0000-0000-0000-00000000000a', 1500)
  on conflict (tenant_id) do update set portal_commission_bp = 1500;
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

-- Direct stays: 400 € in March 2025 and 600 € in May 2025 → budget 60 € + 90 € at 15 %.
select null from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'guest_email', 'march@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 40000, 'status', 'pending_payment',
  'lines', jsonb_build_array(
    jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 2, 'unit_amount_cents', 20000, 'amount_cents', 40000)),
  'source', 'direct', 'check_in', '2025-03-10', 'check_out', '2025-03-12'));
select null from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Hosť', 'guest_email', 'may@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 60000, 'status', 'pending_payment',
  'lines', jsonb_build_array(
    jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 3, 'unit_amount_cents', 20000, 'amount_cents', 60000)),
  'source', 'direct', 'check_in', '2025-05-10', 'check_out', '2025-05-13'));
update public.reservations set status = 'confirmed'
  where tenant_id = '10000000-0000-0000-0000-00000000000a';

-- The owner writes the spend of March and May.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.tenant_marketing_spend (tenant_id, month, amount_cents) values
  ('10000000-0000-0000-0000-00000000000a', '2025-03-01', 2500),
  ('10000000-0000-0000-0000-00000000000a', '2025-05-01', 12000);
select is((select count(*)::int from public.tenant_marketing_spend), 2, 'the owner saves the spend per month');
select throws_ok(
  $$insert into public.tenant_marketing_spend (tenant_id, month, amount_cents)
    values ('10000000-0000-0000-0000-00000000000a', '2025-04-15', 100)$$,
  '23514', null, 'the month is the first day of a month');

create temporary table b as
  select public.tenant_marketing_budget('10000000-0000-0000-0000-00000000000a', '2025-03-01', '2025-05-20') as j;
select is((select (j ->> 'spent_cents')::bigint from b), 12000::bigint, 'the spend of the month');
select is((select (j ->> 'budget_total_cents')::bigint from b), 15000::bigint,
  'budget since the start = direct revenue × commission (60 € + 90 €)');
select is((select (j ->> 'spent_total_cents')::bigint from b), 14500::bigint, 'spent since the start');
select is((select j ->> 'since' from b), '2025-03-01', 'the sums start at the first month');
select is((select public.tenant_marketing_budget('10000000-0000-0000-0000-00000000000a', '2025-03-01', '2025-04-01') ->> 'spent_cents'),
  null, 'a month without the spend: not filled in');

-- The change is in the history of the client.
reset role;
select ok(exists (select 1 from public.record_history h
                  where h.table_name = 'tenant_marketing_spend' and h.tenant_id = '10000000-0000-0000-0000-00000000000a'),
  'the spend is recorded in the history');

-- Reception reads but does not write; another client sees nothing and cannot read the sums.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
update public.tenant_marketing_spend set amount_cents = 1 where month = '2025-03-01';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select amount_cents from public.tenant_marketing_spend where month = '2025-03-01'), 2500::bigint,
  'reception cannot change the spend');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok(
  $$select public.tenant_marketing_budget('10000000-0000-0000-0000-00000000000a', '2025-03-01', '2025-05-01')$$,
  '42501', null, 'another client cannot read the sums');

select * from finish();
rollback;
