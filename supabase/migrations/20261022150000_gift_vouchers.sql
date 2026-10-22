-- Z78 (pripomienka 67): gift vouchers — a value (a payment), not a discount (promo codes stay apart). Only adds:
--   * gift_vouchers: code (not guessable, PREFIX-XXXX-XXXX), value and balance, on whose name, valid until, note,
--     cancelled; gift_voucher_uses: where it was used (history; returned when the reservation is cancelled);
--   * create_reservation: p -> 'gift_voucher' = {code} — the voucher pays up to the price (payment 'gift_voucher'), the
--     rest by the chosen way; all covered → confirmed; approve_reservation confirms when nothing is left to pay;
--   * attempts of the cart limited like promo codes (request_attempts 'gift_voucher').
-- Selling vouchers on the client's page comes later (ROADMAP Fáza 4).

create table public.gift_vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{1,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  balance_cents integer not null check (balance_cents >= 0),
  currency text not null default 'EUR',
  recipient_name text check (length(recipient_name) between 1 and 120),
  valid_until date,
  note text check (length(note) <= 500),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (balance_cents <= amount_cents)
);

comment on table public.gift_vouchers is
  'Z78: gift vouchers of a client — a value paid by the guest in the cart (payment gift_voucher), not a discount.';

create table public.gift_voucher_uses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  voucher_id uuid not null references public.gift_vouchers (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  -- When the reservation was cancelled the amount went back to the voucher.
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create index gift_voucher_uses_voucher_idx on public.gift_voucher_uses (voucher_id);
create index gift_voucher_uses_reservation_idx on public.gift_voucher_uses (reservation_id);

alter table public.gift_vouchers enable row level security;
alter table public.gift_voucher_uses enable row level security;
-- The team reads and edits (name, valid until, note, cancel); new ones only through gift_voucher_create (the code),
-- the balance only through the reservation.
grant select, update (recipient_name, valid_until, note, status, updated_at) on public.gift_vouchers to authenticated;
grant select on public.gift_voucher_uses to authenticated;
create policy gift_vouchers_staff_read on public.gift_vouchers for select to authenticated
  using (public.is_tenant_staff(tenant_id));
create policy gift_vouchers_staff_update on public.gift_vouchers for update to authenticated
  using (public.is_tenant_staff(tenant_id)) with check (public.is_tenant_staff(tenant_id));
create policy gift_voucher_uses_staff_read on public.gift_voucher_uses for select to authenticated
  using (public.is_tenant_staff(tenant_id));

create trigger record_history after insert or update or delete on public.gift_vouchers
  for each row execute function public.record_history_capture('id');

-- A new voucher with a code that cannot be guessed: the client's prefix + 8 random characters (no 0/O, 1/I/L).
create or replace function public.gift_voucher_create(
  p_tenant_id uuid, p_amount_cents integer, p_recipient_name text default null, p_valid_until date default null,
  p_note text default null)
returns public.gift_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_prefix text;
  v_code text;
  v_bytes bytea;
  v_row public.gift_vouchers;
  v_currency text;
begin
  if not public.is_tenant_staff(p_tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select upper(left(regexp_replace(t.slug, '[^a-zA-Z0-9]', '', 'g'), 8)), coalesce(t.currency, 'EUR')
    into v_prefix, v_currency from public.tenants t where t.id = p_tenant_id;
  v_prefix := coalesce(nullif(v_prefix, ''), 'POUKAZ');
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := v_prefix || '-';
    for i in 0..7 loop
      if i = 4 then
        v_code := v_code || '-';
      end if;
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.gift_vouchers g where g.tenant_id = p_tenant_id and g.code = v_code);
  end loop;
  insert into public.gift_vouchers (tenant_id, code, amount_cents, balance_cents, currency, recipient_name, valid_until,
    note)
  values (p_tenant_id, v_code, p_amount_cents, p_amount_cents, v_currency, nullif(trim(p_recipient_name), ''),
    p_valid_until, nullif(trim(p_note), ''))
  returning * into v_row;
  return v_row;
end;
$$;

-- A cancelled reservation returns what the voucher paid (the payment is marked refunded).
create or replace function public.gift_voucher_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    for u in select * from public.gift_voucher_uses where reservation_id = new.id and returned_at is null for update loop
      update public.gift_vouchers set balance_cents = least(amount_cents, balance_cents + u.amount_cents),
        updated_at = now() where id = u.voucher_id;
      update public.gift_voucher_uses set returned_at = now() where id = u.id;
    end loop;
    update public.payments set status = 'refunded'
    where reservation_id = new.id and provider = 'gift_voucher' and status = 'received';
  end if;
  return new;
end;
$$;

create trigger gift_voucher_release after update of status on public.reservations
  for each row execute function public.gift_voucher_release();

alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check (
  provider in ('bank_transfer', 'card', 'on_site', 'recreation_voucher', 'gift_voucher'));

-- Attempts of the cart (as promo codes). The list is that of 20261017100000_staff_login_limit.sql + the new one.
alter table public.request_attempts drop constraint request_attempts_action_check;
alter table public.request_attempts add constraint request_attempts_action_check
  check (action in ('reservation', 'promo', 'login_code', 'login_verify', 'staff_link', 'gift_voucher'));

-- create_reservation as in 20261022130000_approval_voucher.sql; changed (Z78): p -> 'gift_voucher' = {code}.
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
  v_source text := coalesce(p ->> 'source', 'direct');
  v_total integer := (p ->> 'total_cents')::integer;
  v_method text := coalesce(nullif(p ->> 'payment_method', ''), 'bank_transfer');
  v_billing jsonb := p -> 'billing';
  v_voucher jsonb := p -> 'voucher';
  v_gift_code text := upper(trim(p -> 'gift_voucher' ->> 'code'));
  v_gift public.gift_vouchers;
  v_gift_cents integer := 0;
  v_approval text;
  v_lines_total integer;
  v_max_guests smallint;
  v_due timestamptz;
  v_approval_due timestamptz;
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

  select u.max_guests, p2.booking_approval into v_max_guests, v_approval
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

  -- Z78: a gift voucher pays part (or all) of the price — locked, checked and deducted here, atomically.
  if v_gift_code is not null and v_gift_code <> '' then
    select * into v_gift from public.gift_vouchers g
    where g.tenant_id = v_tenant and g.code = v_gift_code for update;
    if v_gift.id is null or v_gift.status <> 'active' or v_gift.balance_cents <= 0
       or (v_gift.valid_until is not null and v_gift.valid_until < current_date) then
      raise exception 'gift voucher not usable' using errcode = 'P0002';
    end if;
    v_gift_cents := least(v_gift.balance_cents, v_total);
  end if;

  -- Z77: a booking by the guest waits for the owner when the property says so or when it is paid by a voucher.
  if v_status = 'pending_payment' and v_source = 'direct'
     and (v_approval = 'approval' or v_method = 'recreation_voucher') then
    v_status := 'awaiting_approval';
    v_approval_due := now() + interval '48 hours';
  end if;

  -- Z78: nothing left to pay (the gift voucher covers all) → confirmed at once (unless the owner approves first).
  if v_status = 'pending_payment' and v_gift_cents >= v_total and v_total > 0 then
    v_status := 'confirmed';
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
    billing_company, billing_company_id, billing_tax_id, billing_vat_id, billing_address,
    approval_due_at, voucher_number, voucher_issuer)
  values (
    v_tenant, v_property, v_number, v_status, v_source,
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
    nullif(trim(v_billing ->> 'address'), ''),
    v_approval_due, nullif(trim(v_voucher ->> 'number'), ''), nullif(trim(v_voucher ->> 'issuer'), ''))
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

  -- Z78: the part paid by the gift voucher (received now), the balance of the voucher goes down.
  if v_gift_cents > 0 then
    insert into public.payments (tenant_id, reservation_id, provider, amount_cents, currency, variable_symbol, status,
      received_at)
    values (v_tenant, v_id, 'gift_voucher', v_gift_cents, p ->> 'currency', replace(v_number, '-', ''), 'received', now());
    update public.gift_vouchers set balance_cents = balance_cents - v_gift_cents, updated_at = now()
    where gift_vouchers.id = v_gift.id;
    insert into public.gift_voucher_uses (tenant_id, voucher_id, reservation_id, amount_cents)
    values (v_tenant, v_gift.id, v_id, v_gift_cents);
  end if;

  if v_total - v_gift_cents > 0 or v_total = 0 then
    insert into public.payments (tenant_id, reservation_id, provider, amount_cents, currency, variable_symbol, status,
      received_at, received_by)
    values (v_tenant, v_id, v_method, v_total - v_gift_cents, p ->> 'currency', replace(v_number, '-', ''),
      case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then 'received' else 'pending' end,
      case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then now() end,
      case when v_status = 'confirmed' and coalesce((p ->> 'paid')::boolean, false) then (p ->> 'created_by')::uuid end);
  end if;

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

-- approve_reservation as in 20261022130000_approval_voucher.sql; changed (Z78): confirmed when nothing is left to pay.
create or replace function public.approve_reservation(p_reservation_id uuid, p_voucher jsonb default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reservations;
  v_amount integer;
  v_rest integer;
  v_hours integer;
  v_to text;
begin
  select * into r from public.reservations where id = p_reservation_id for update;
  if r.id is null or not public.is_tenant_staff(r.tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if r.status <> 'awaiting_approval' then
    raise exception 'not awaiting approval' using errcode = '22023';
  end if;
  select coalesce(s.payment_due_hours, 24) into v_hours from public.tenant_settings s where s.tenant_id = r.tenant_id;
  v_hours := coalesce(v_hours, 24);

  if r.payment_method = 'recreation_voucher' then
    v_amount := (p_voucher ->> 'amount_cents')::integer;
    if v_amount is null or v_amount <= 0 or v_amount > r.total_cents then
      raise exception 'invalid voucher amount' using errcode = '22023';
    end if;
    update public.reservations set
      voucher_amount_cents = v_amount,
      voucher_company = nullif(trim(p_voucher ->> 'company'), ''),
      voucher_company_id = nullif(trim(p_voucher ->> 'company_id'), ''),
      voucher_tax_id = nullif(trim(p_voucher ->> 'tax_id'), ''),
      voucher_vat_id = nullif(trim(p_voucher ->> 'vat_id'), ''),
      voucher_address = nullif(trim(p_voucher ->> 'address'), '')
    where id = r.id;
    update public.payments set amount_cents = v_amount, status = 'received', received_at = now(),
      received_by = (select auth.uid())
    where reservation_id = r.id and provider = 'recreation_voucher' and status = 'pending' and purpose = 'reservation';
    v_rest := r.total_cents - v_amount;
    if v_rest > 0 then
      insert into public.payments (tenant_id, reservation_id, provider, amount_cents, currency, variable_symbol, status)
      values (r.tenant_id, r.id, 'bank_transfer', v_rest, r.currency, replace(r.number, '-', ''), 'pending');
    end if;
    v_to := case when v_rest > 0 then 'pending_payment' else 'confirmed' end;
  else
    -- Z78: a gift voucher may have paid all — then confirmed at once.
    v_to := case when exists (select 1 from public.payments x where x.reservation_id = r.id
                                and x.status = 'pending' and x.purpose = 'reservation')
                 then 'pending_payment' else 'confirmed' end;
  end if;

  update public.reservations set approved_at = now(), approved_by = (select auth.uid()),
    payment_due_at = case when v_to = 'pending_payment' then now() + make_interval(hours => v_hours) end
  where id = r.id;
  perform public.change_reservation_status(r.id, v_to, (select auth.uid()), 'approved');
  return v_to;
end;
$$;

-- reservation_by_token as in 20261022130000_approval_voucher.sql; changed (Z78): the open payment, not the voucher.
create or replace function public.reservation_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'tenant_id', r.tenant_id, 'property_id', r.property_id, 'number', r.number, 'status', r.status,
    'guest_name', r.guest_name, 'guest_email', r.guest_email, 'adults', r.adults, 'children', r.children,
    'infants', r.infants, 'pets', r.pets, 'locale', r.locale, 'currency', r.currency, 'total_cents', r.total_cents,
    'payment_due_at', r.payment_due_at, 'cancellation_requested_at', r.cancellation_requested_at,
    'created_at', r.created_at, 'payment_method', r.payment_method, 'approval_due_at', r.approval_due_at,
    'voucher_amount_cents', r.voucher_amount_cents,
    'check_in', i.check_in, 'check_out', i.check_out,
    'property_name', p.name, 'property_slug', p.slug,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('kind', l.kind, 'label', l.label, 'quantity', l.quantity,
               'unit_amount_cents', l.unit_amount_cents, 'amount_cents', l.amount_cents) order by l.sort), '[]'::jsonb)
              from public.reservation_lines l where l.reservation_id = r.id),
    'payment', (select jsonb_build_object('status', pm.status, 'variable_symbol', pm.variable_symbol,
               'amount_cents', pm.amount_cents) from public.payments pm
               where pm.reservation_id = r.id and pm.purpose = 'reservation'
               order by (pm.provider in ('recreation_voucher', 'gift_voucher')), pm.created_at desc limit 1),
    'bank', (select jsonb_build_object('iban', s.iban, 'account_holder', s.account_holder, 'bic', s.bic)
             from public.tenant_settings s where s.tenant_id = r.tenant_id)
  )
  from public.reservations r
  join public.reservation_items i on i.reservation_id = r.id
  join public.properties p on p.id = r.property_id
  where r.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

revoke execute on function public.gift_voucher_create(uuid, integer, text, date, text) from public, anon;
grant execute on function public.gift_voucher_create(uuid, integer, text, date, text) to authenticated;
revoke execute on function public.gift_voucher_release() from public, anon, authenticated;
