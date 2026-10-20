-- Z71 (pripomienky 57, 62): the cart saves the chosen way to pay and, when the guest asks, the company for the invoice.
-- Only adds: columns on reservations (RLS and record_history of reservations apply) and create_reservation reads them.
-- The address of an ordinary guest is not collected here (the online check-in does).

alter table public.reservations
  add column payment_method text not null default 'bank_transfer' check (payment_method in ('bank_transfer', 'card')),
  add column billing_company text check (length(billing_company) between 1 and 200),
  add column billing_company_id text check (length(billing_company_id) between 1 and 20),
  add column billing_tax_id text check (length(billing_tax_id) between 1 and 20),
  add column billing_vat_id text check (length(billing_vat_id) between 1 and 20),
  add column billing_address text check (length(billing_address) between 1 and 300),
  add constraint reservations_billing_complete check (
    billing_company is null or (billing_company_id is not null and billing_address is not null));

comment on column public.reservations.payment_method is 'Way to pay chosen in the cart (Z71): bank_transfer (QR) or card (Stripe, before the launch).';
comment on column public.reservations.billing_company is 'Invoice to a company (Z71): name; with IČO, DIČ, IČ DPH (optional) and the address.';

-- create_reservation as in 20261016170000_reservation_functions.sql; changed (Z71): payment_method and billing
-- (p -> 'billing': company, company_id, tax_id, vat_id, address); the payment row uses the chosen method.
create or replace function public.create_reservation(p jsonb)
returns table (id uuid, number text, access_token text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_tenant uuid := (p ->> 'tenant_id')::uuid;
  v_property uuid := (p ->> 'property_id')::uuid;
  v_unit uuid := (p ->> 'unit_id')::uuid;
  v_check_in date := (p ->> 'check_in')::date;
  v_check_out date := (p ->> 'check_out')::date;
  v_status text := coalesce(p ->> 'status', 'pending_payment');
  v_total integer := (p ->> 'total_cents')::integer;
  v_method text := coalesce(nullif(p ->> 'payment_method', ''), 'bank_transfer');
  v_billing jsonb := p -> 'billing';
  v_lines_total integer;
  v_max_guests smallint;
  v_due timestamptz;
  v_number text;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
  v_line jsonb;
  v_consent jsonb;
  v_sort smallint := 0;
begin
  if v_status not in ('pending_payment', 'confirmed') then
    raise exception 'invalid initial status' using errcode = '22023';
  end if;
  if v_check_out <= v_check_in then
    raise exception 'invalid dates' using errcode = '22023';
  end if;

  select u.max_guests into v_max_guests
  from public.units u join public.properties p2 on p2.id = u.property_id
  where u.id = v_unit and u.property_id = v_property and u.tenant_id = v_tenant and u.active;
  if v_max_guests is null then
    raise exception 'unit does not belong to property' using errcode = '22023';
  end if;
  if coalesce((p ->> 'adults')::int, 1) + coalesce((p ->> 'children')::int, 0) > v_max_guests then
    raise exception 'too many guests' using errcode = '22023';
  end if;

  select coalesce(sum((l ->> 'amount_cents')::integer), 0) into v_lines_total
  from jsonb_array_elements(coalesce(p -> 'lines', '[]'::jsonb)) l
  where l ->> 'kind' <> 'deposit';
  if v_lines_total <> v_total then
    raise exception 'total does not match lines' using errcode = '22023';
  end if;

  if v_status = 'pending_payment' then
    select now() + make_interval(hours => coalesce(s.payment_due_hours, 24)) into v_due
    from public.tenants t left join public.tenant_settings s on s.tenant_id = t.id where t.id = v_tenant;
  end if;

  v_number := public.next_reservation_number(v_tenant);

  insert into public.reservations (
    tenant_id, property_id, number, status, source, guest_name, guest_email, guest_phone, guest_country,
    adults, children, infants, pets, locale, currency, total_cents, payment_due_at, guest_note, promo_code,
    access_token_hash, marketing_consent, created_by, payment_method,
    billing_company, billing_company_id, billing_tax_id, billing_vat_id, billing_address)
  values (
    v_tenant, v_property, v_number, v_status, coalesce(p ->> 'source', 'direct'),
    trim(p ->> 'guest_name'), lower(trim(p ->> 'guest_email')), nullif(trim(p ->> 'guest_phone'), ''),
    nullif(upper(p ->> 'guest_country'), ''),
    coalesce((p ->> 'adults')::smallint, 1), coalesce((p ->> 'children')::smallint, 0),
    coalesce((p ->> 'infants')::smallint, 0), coalesce((p ->> 'pets')::smallint, 0),
    coalesce(p ->> 'locale', 'sk'), p ->> 'currency', v_total, v_due, nullif(trim(p ->> 'guest_note'), ''),
    nullif(upper(trim(p ->> 'promo_code')), ''),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    coalesce((p ->> 'marketing_consent')::boolean, false), (p ->> 'created_by')::uuid, v_method,
    nullif(trim(v_billing ->> 'company'), ''), nullif(trim(v_billing ->> 'company_id'), ''),
    nullif(trim(v_billing ->> 'tax_id'), ''), nullif(trim(v_billing ->> 'vat_id'), ''),
    nullif(trim(v_billing ->> 'address'), ''))
  returning reservations.id into v_id;

  insert into public.reservation_items (tenant_id, reservation_id, unit_id, check_in, check_out)
  values (v_tenant, v_id, v_unit, v_check_in, v_check_out);

  for v_line in select * from jsonb_array_elements(coalesce(p -> 'lines', '[]'::jsonb)) loop
    v_sort := v_sort + 1;
    insert into public.reservation_lines (tenant_id, reservation_id, sort, kind, ref_id, label, quantity,
      unit_amount_cents, amount_cents, vat_bp, meta)
    values (v_tenant, v_id, v_sort, v_line ->> 'kind', (v_line ->> 'ref_id')::uuid, v_line ->> 'label',
      coalesce((v_line ->> 'quantity')::integer, 1), (v_line ->> 'unit_amount_cents')::integer,
      (v_line ->> 'amount_cents')::integer, coalesce((v_line ->> 'vat_bp')::integer, 0),
      coalesce(v_line -> 'meta', '{}'::jsonb));
  end loop;

  for v_consent in select * from jsonb_array_elements(coalesce(p -> 'consents', '[]'::jsonb)) loop
    insert into public.reservation_consents (tenant_id, reservation_id, kind, version, text_snapshot, granted)
    values (v_tenant, v_id, v_consent ->> 'kind', v_consent ->> 'version', v_consent ->> 'text',
      coalesce((v_consent ->> 'granted')::boolean, false));
  end loop;

  insert into public.payments (tenant_id, reservation_id, provider, amount_cents, currency, variable_symbol, status,
    received_at, received_by)
  values (v_tenant, v_id, v_method, v_total, p ->> 'currency', replace(v_number, '-', ''),
    case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then 'received' else 'pending' end,
    case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then now() end,
    case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then (p ->> 'created_by')::uuid end);

  insert into public.reservation_status_history (tenant_id, reservation_id, from_status, to_status, changed_by)
  values (v_tenant, v_id, null, v_status, (p ->> 'created_by')::uuid);

  -- The hold of this guest becomes the reservation; then the term is taken atomically (23P01 on overlap).
  if p ? 'hold_id' and p ->> 'hold_id' is not null then
    delete from public.occupancy o where o.id = (p ->> 'hold_id')::uuid and o.kind = 'hold' and o.unit_id = v_unit;
  end if;
  perform public.purge_expired_holds(v_unit);
  insert into public.occupancy (tenant_id, unit_id, nights, kind, reservation_id, created_by)
  values (v_tenant, v_unit, public.stay_nights(v_unit, v_check_in, v_check_out), 'reservation', v_id,
    (p ->> 'created_by')::uuid);

  return query select v_id, v_number, v_token;
end;
$$;
