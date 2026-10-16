-- Reservation flow (B5): all status changes go through these functions and are recorded in the status history.
-- Creating a reservation is service-role only: the server recomputes the price (pure function, B3) and passes
-- the frozen lines; the database guarantees the term is free (occupancy exclusion constraint).

-- Next number in the tenant's yearly series, e.g. 2026-0001.
create or replace function public.next_reservation_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year smallint := extract(year from now() at time zone 'Europe/Bratislava')::smallint;
  v_value integer;
begin
  insert into public.reservation_counters (tenant_id, year, last_value)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update set last_value = public.reservation_counters.last_value + 1
  returning last_value into v_value;
  return v_year::text || '-' || lpad(v_value::text, 4, '0');
end;
$$;

-- Nights a stay blocks, including the cleaning gap of the property.
create or replace function public.stay_nights(p_unit_id uuid, p_check_in date, p_check_out date)
returns daterange
language sql
stable
security definer
set search_path = ''
as $$
  select daterange(p_check_in, p_check_out + coalesce(p.cleaning_gap_days, 0), '[)')
  from public.units u join public.properties p on p.id = u.property_id
  where u.id = p_unit_id;
$$;

create or replace function public.purge_expired_holds(p_unit_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.occupancy where unit_id = p_unit_id and kind = 'hold' and expires_at < now();
$$;

-- Temporary hold while the guest fills the form (B2). Returns the hold id, or raises 23P01 when the term is taken.
create or replace function public.create_hold(p_unit_id uuid, p_check_in date, p_check_out date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_minutes smallint;
  v_id uuid;
begin
  select u.tenant_id, coalesce(s.hold_minutes, 30) into v_tenant, v_minutes
  from public.units u left join public.tenant_settings s on s.tenant_id = u.tenant_id
  where u.id = p_unit_id;
  if v_tenant is null then
    raise exception 'unknown unit' using errcode = '22023';
  end if;
  perform public.purge_expired_holds(p_unit_id);
  insert into public.occupancy (tenant_id, unit_id, nights, kind, expires_at)
  values (v_tenant, p_unit_id, public.stay_nights(p_unit_id, p_check_in, p_check_out), 'hold',
          now() + make_interval(mins => v_minutes))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.release_hold(p_hold_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.occupancy where id = p_hold_id and kind = 'hold';
$$;

/*
  Creates a reservation with frozen price lines. p is a jsonb object:
  tenant_id, property_id, unit_id, check_in, check_out, status ('pending_payment' | 'confirmed'), source,
  guest_name, guest_email, guest_phone, guest_country, adults, children, infants, pets, locale, currency,
  total_cents, guest_note, promo_code, marketing_consent, created_by, hold_id,
  lines: [{kind, ref_id, label, quantity, unit_amount_cents, amount_cents, vat_bp, meta}],
  consents: [{kind, version, text, granted}]
  Returns id, number and the plain access token (only its hash is stored).
*/
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
    access_token_hash, marketing_consent, created_by)
  values (
    v_tenant, v_property, v_number, v_status, coalesce(p ->> 'source', 'direct'),
    trim(p ->> 'guest_name'), lower(trim(p ->> 'guest_email')), nullif(trim(p ->> 'guest_phone'), ''),
    nullif(upper(p ->> 'guest_country'), ''),
    coalesce((p ->> 'adults')::smallint, 1), coalesce((p ->> 'children')::smallint, 0),
    coalesce((p ->> 'infants')::smallint, 0), coalesce((p ->> 'pets')::smallint, 0),
    coalesce(p ->> 'locale', 'sk'), p ->> 'currency', v_total, v_due, nullif(trim(p ->> 'guest_note'), ''),
    nullif(upper(trim(p ->> 'promo_code')), ''),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    coalesce((p ->> 'marketing_consent')::boolean, false), (p ->> 'created_by')::uuid)
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
  values (v_tenant, v_id, 'bank_transfer', v_total, p ->> 'currency', replace(v_number, '-', ''),
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

-- Internal: status change with history. Callers check permissions.
create or replace function public.change_reservation_status(
  p_reservation_id uuid, p_to text, p_actor uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text;
  v_tenant uuid;
begin
  select status, tenant_id into v_from, v_tenant from public.reservations where id = p_reservation_id for update;
  if v_from is null then
    raise exception 'unknown reservation' using errcode = '22023';
  end if;
  if v_from = p_to then
    return;
  end if;
  if not (
    (v_from = 'pending_payment' and p_to in ('confirmed', 'cancelled'))
    or (v_from = 'confirmed' and p_to in ('in_progress', 'completed', 'cancelled'))
    or (v_from = 'in_progress' and p_to in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid status change % -> %', v_from, p_to using errcode = '22023';
  end if;

  update public.reservations
  set status = p_to,
      payment_due_at = case when p_to = 'pending_payment' then payment_due_at end,
      cancelled_reason = case when p_to = 'cancelled' then p_reason else cancelled_reason end
  where id = p_reservation_id;

  if p_to = 'cancelled' then
    -- Released terms stay in history but stop blocking.
    update public.occupancy set is_blocking = false where reservation_id = p_reservation_id;
    update public.payments set status = 'cancelled' where reservation_id = p_reservation_id and status = 'pending';
  end if;

  insert into public.reservation_status_history (tenant_id, reservation_id, from_status, to_status, changed_by, reason)
  values (v_tenant, p_reservation_id, v_from, p_to, p_actor, p_reason);
end;
$$;

-- Owner / reception: bank transfer arrived → confirmed (B5).
create or replace function public.confirm_payment(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.payments
  set status = 'received', received_at = now(), received_by = (select auth.uid())
  where reservation_id = p_reservation_id and status = 'pending';
  perform public.change_reservation_status(p_reservation_id, 'confirmed', (select auth.uid()), null);
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.change_reservation_status(p_reservation_id, 'cancelled', (select auth.uid()), p_reason);
end;
$$;

-- Scheduled: cancel reservations whose payment deadline passed and free the term (B5). Returns their ids.
create or replace function public.expire_pending_reservations()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    select r.id from public.reservations r
    where r.status = 'pending_payment' and r.payment_due_at < now()
    for update skip locked
  loop
    perform public.change_reservation_status(v_id, 'cancelled', null, 'payment_deadline_expired');
    return next v_id;
  end loop;
  delete from public.occupancy where kind = 'hold' and expires_at < now();
end;
$$;

-- Guest access by link (no account): summary of the reservation without internal data.
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
    'created_at', r.created_at,
    'check_in', i.check_in, 'check_out', i.check_out,
    'property_name', p.name, 'property_slug', p.slug,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('kind', l.kind, 'label', l.label, 'quantity', l.quantity,
               'unit_amount_cents', l.unit_amount_cents, 'amount_cents', l.amount_cents) order by l.sort), '[]'::jsonb)
              from public.reservation_lines l where l.reservation_id = r.id),
    'payment', (select jsonb_build_object('status', pm.status, 'variable_symbol', pm.variable_symbol,
               'amount_cents', pm.amount_cents) from public.payments pm where pm.reservation_id = r.id
               order by pm.created_at limit 1),
    'bank', (select jsonb_build_object('iban', s.iban, 'account_holder', s.account_holder, 'bic', s.bic)
             from public.tenant_settings s where s.tenant_id = r.tenant_id)
  )
  from public.reservations r
  join public.reservation_items i on i.reservation_id = r.id
  join public.properties p on p.id = r.property_id
  where r.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

-- Guest asks for cancellation; the owner decides (B5).
create or replace function public.request_cancellation(p_token text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.reservations
  set cancellation_requested_at = coalesce(cancellation_requested_at, now()),
      cancellation_request_note = left(nullif(trim(p_note), ''), 2000)
  where access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and status in ('pending_payment', 'confirmed')
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- Public availability of a unit: blocked nights only, no details (guest calendar).
create or replace function public.unit_busy_nights(p_unit_id uuid, p_from date, p_to date)
returns table (nights daterange)
language sql
stable
security definer
set search_path = ''
as $$
  select o.nights from public.occupancy o join public.units u on u.id = o.unit_id
  where o.unit_id = p_unit_id and o.is_blocking
    and (o.kind <> 'hold' or o.expires_at > now())
    and o.nights && daterange(p_from, p_to, '[)')
    and public.is_public_property(u.property_id);
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  public.next_reservation_number(uuid), public.stay_nights(uuid, date, date), public.purge_expired_holds(uuid),
  public.create_hold(uuid, date, date), public.release_hold(uuid), public.create_reservation(jsonb),
  public.change_reservation_status(uuid, text, uuid, text), public.confirm_payment(uuid),
  public.cancel_reservation(uuid, text), public.expire_pending_reservations(), public.reservation_by_token(text),
  public.request_cancellation(text, text), public.unit_busy_nights(uuid, date, date)
  from public, anon, authenticated;

-- Server-only (service role): creation, holds, expiry.
grant execute on function public.create_hold(uuid, date, date), public.release_hold(uuid),
  public.create_reservation(jsonb), public.expire_pending_reservations() to service_role;
-- Staff actions (permission checked inside).
grant execute on function public.confirm_payment(uuid), public.cancel_reservation(uuid, text) to authenticated;
-- Guests.
grant execute on function public.reservation_by_token(text), public.request_cancellation(text, text),
  public.unit_busy_nights(uuid, date, date) to anon, authenticated;
