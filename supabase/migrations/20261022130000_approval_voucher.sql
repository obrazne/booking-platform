-- Z77 (pripomienky 66, 68): reservations on approval and the recreation voucher. Only adds / widens:
--   * properties.booking_approval: 'instant' (as before) or 'approval' — the owner approves within 48 h;
--   * reservation status 'awaiting_approval' (the term is held), approval_due_at, who approved;
--   * payment method 'recreation_voucher' (switched on by the client) — always on approval; at the approval the owner
--     fills in the company of the voucher and its amount; the rest the guest pays by transfer (QR after the approval);
--   * e-mails, bell and push; reminder after 24 h, automatic cancellation after the deadline (the existing cron job).
-- Card on approval (block, capture at the approval) waits for Stripe — the card is not offered on approval yet.

alter table public.properties
  add column booking_approval text not null default 'instant' check (booking_approval in ('instant', 'approval'));
comment on column public.properties.booking_approval is
  'Z77: how reservations are accepted — instant (as before) or approval (the owner approves within 48 h).';
-- The guest page reads it (the cart says that the owner approves) — public like the other columns of the page.
grant select (booking_approval) on public.properties to anon;

alter table public.tenant_settings add column voucher_enabled boolean not null default false;
comment on column public.tenant_settings.voucher_enabled is 'Z77: the recreation voucher as a way to pay in the cart.';

alter table public.reservations drop constraint reservations_status_check;
alter table public.reservations add constraint reservations_status_check check (status in (
  'awaiting_approval', 'pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled'));

alter table public.reservations drop constraint reservations_payment_method_check;
alter table public.reservations add constraint reservations_payment_method_check check (
  payment_method in ('bank_transfer', 'card', 'recreation_voucher'));

alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check (
  provider in ('bank_transfer', 'card', 'on_site', 'recreation_voucher'));

alter table public.reservations
  add column approval_due_at timestamptz,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null,
  add column voucher_number text check (length(voucher_number) between 1 and 60),
  add column voucher_issuer text check (length(voucher_issuer) between 1 and 120),
  add column voucher_amount_cents integer check (voucher_amount_cents > 0),
  add column voucher_company text check (length(voucher_company) between 1 and 200),
  add column voucher_company_id text check (length(voucher_company_id) between 1 and 20),
  add column voucher_tax_id text check (length(voucher_tax_id) between 1 and 20),
  add column voucher_vat_id text check (length(voucher_vat_id) between 1 and 20),
  add column voucher_address text check (length(voucher_address) between 1 and 300),
  add constraint reservations_voucher_complete check (
    payment_method <> 'recreation_voucher' or (voucher_number is not null and voucher_issuer is not null)),
  add constraint reservations_voucher_billing check (
    voucher_amount_cents is null or (voucher_company is not null and voucher_company_id is not null
                                     and voucher_address is not null));

comment on column public.reservations.approval_due_at is 'Z77: until when the owner approves (48 h); then cancelled.';
comment on column public.reservations.voucher_amount_cents is
  'Z77: the amount of the recreation voucher filled in by the owner at the approval (buyer = voucher_company).';

-- change_reservation_status as in 20261016170000_reservation_functions.sql; changed (Z77): from awaiting_approval to
-- pending_payment, confirmed or cancelled; the deadline of the approval ends with the approval.
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
    (v_from = 'awaiting_approval' and p_to in ('pending_payment', 'confirmed', 'cancelled'))
    or (v_from = 'pending_payment' and p_to in ('confirmed', 'cancelled'))
    or (v_from = 'confirmed' and p_to in ('in_progress', 'completed', 'cancelled'))
    or (v_from = 'in_progress' and p_to in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid status change % -> %', v_from, p_to using errcode = '22023';
  end if;

  update public.reservations
  set status = p_to,
      payment_due_at = case when p_to = 'pending_payment' then payment_due_at end,
      approval_due_at = case when p_to = 'awaiting_approval' then approval_due_at end,
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

-- create_reservation as in 20261020120000_cart_payment_billing.sql; changed (Z77): a direct booking of a property
-- "na schválenie", or one paid by a recreation voucher, starts as awaiting_approval (48 h, no payment deadline yet);
-- the voucher's number and issuer (p -> 'voucher').
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

  -- Z77: a booking by the guest waits for the owner when the property says so or when it is paid by a voucher.
  if v_status = 'pending_payment' and v_source = 'direct'
     and (v_approval = 'approval' or v_method = 'recreation_voucher') then
    v_status := 'awaiting_approval';
    v_approval_due := now() + interval '48 hours';
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

-- Owner / reception approve (Z77). Bank transfer: the guest gets the payment details now and the deadline of the
-- payment starts now. Recreation voucher: p_voucher = {amount_cents, company, company_id, tax_id, vat_id, address};
-- the voucher counts as received (the owner redeems it with the issuer), the rest is paid by transfer; nothing left
-- to pay → confirmed.
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
    v_to := 'pending_payment';
  end if;

  update public.reservations set approved_at = now(), approved_by = (select auth.uid()),
    payment_due_at = case when v_to = 'pending_payment' then now() + make_interval(hours => v_hours) end
  where id = r.id;
  perform public.change_reservation_status(r.id, v_to, (select auth.uid()), 'approved');
  return v_to;
end;
$$;

-- Owner / reception decline (Z77): the term is released, the guest gets an e-mail.
create or replace function public.decline_reservation(p_reservation_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_status text;
begin
  select tenant_id, status into v_tenant, v_status from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_status <> 'awaiting_approval' then
    raise exception 'not awaiting approval' using errcode = '22023';
  end if;
  -- Why (for the team): an internal note of the reservation.
  if nullif(trim(p_note), '') is not null and (select auth.uid()) is not null then
    insert into public.reservation_notes (tenant_id, reservation_id, author_id, body)
    values (v_tenant, p_reservation_id, (select auth.uid()), left(trim(p_note), 4000));
  end if;
  perform public.change_reservation_status(p_reservation_id, 'cancelled', (select auth.uid()), 'approval_declined');
end;
$$;

-- expire_pending_reservations as in 20261016170000_reservation_functions.sql; changed (Z77): the reminder of the
-- approval after 24 h (e-mail, bell, push) and the cancellation of the requests not approved within 48 h. The cron job
-- expire-pending-reservations (every 5 minutes) stays.
create or replace function public.expire_pending_reservations()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_due record;
begin
  for v_id in
    select r.id from public.reservations r
    where r.status = 'pending_payment' and r.payment_due_at < now()
    for update skip locked
  loop
    perform public.change_reservation_status(v_id, 'cancelled', null, 'payment_deadline_expired');
    return next v_id;
  end loop;

  for v_due in
    select x.id, x.tenant_id from public.reservations x
    where x.status = 'awaiting_approval' and x.approval_due_at - interval '24 hours' < now()
      and x.approval_due_at >= now()
  loop
    insert into public.email_outbox (tenant_id, reservation_id, kind)
    values (v_due.tenant_id, v_due.id, 'owner_approval_reminder') on conflict do nothing;
    perform public.notify(v_due.tenant_id, 'tenant', 'approval_request',
      public.reservation_notice(v_due.id) || jsonb_build_object('reminder', true),
      '/admin/reservations?panel=reservation:' || v_due.id, 'approval_reminder:' || v_due.id);
  end loop;

  for v_id in
    select x.id from public.reservations x
    where x.status = 'awaiting_approval' and x.approval_due_at < now()
    for update skip locked
  loop
    perform public.change_reservation_status(v_id, 'cancelled', null, 'approval_expired');
    return next v_id;
  end loop;
  delete from public.occupancy where kind = 'hold' and expires_at < now();
end;
$$;

-- reservation_notice as in 20261017140000_notifications.sql; changed (Z77): the deadline of the approval.
create or replace function public.reservation_notice(p_reservation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', r.number, 'guest', r.guest_name, 'total_cents', r.total_cents, 'currency', r.currency,
    'due_at', coalesce(r.payment_due_at, r.approval_due_at),
    'check_in', (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id),
    'check_out', (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id))
  from public.reservations r where r.id = p_reservation_id;
$$;

-- notify_reservation_status as in 20261017140000_notifications.sql; changed (Z77): a request to approve is its own
-- kind (bell + push), so the owner sees that it waits for them.
create or replace function public.notify_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_target text := '/admin/reservations?panel=reservation:' || new.reservation_id;
begin
  select source into v_source from public.reservations where id = new.reservation_id;
  if v_source in ('booking', 'airbnb') then
    return new;
  end if;
  if new.from_status is null and new.to_status = 'awaiting_approval' then
    perform public.notify(new.tenant_id, 'tenant', 'approval_request', public.reservation_notice(new.reservation_id),
      v_target, 'approval_request:' || new.reservation_id, new.changed_by);
  elsif new.from_status is null then
    perform public.notify(new.tenant_id, 'tenant', 'reservation_new', public.reservation_notice(new.reservation_id),
      v_target, 'reservation_new:' || new.reservation_id, new.changed_by);
  elsif new.to_status = 'cancelled' and new.from_status is distinct from 'cancelled' then
    perform public.notify(new.tenant_id, 'tenant', 'reservation_cancelled',
      public.reservation_notice(new.reservation_id) || jsonb_build_object('reason', new.reason),
      v_target, 'reservation_cancelled:' || new.reservation_id, new.changed_by);
  end if;
  return new;
end;
$$;

-- enqueue_status_emails as in 20261016230000_email_outbox.sql; changed (Z77): request to approve (guest: "čaká na
-- potvrdenie", owner: "schváľte do 48 h"), approved → the payment details (guest_approved) or confirmed.
create or replace function public.enqueue_status_emails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
begin
  select source into v_source from public.reservations where id = new.reservation_id;
  if v_source in ('booking', 'airbnb') then
    return new;
  end if;
  if new.from_status is null and new.to_status = 'awaiting_approval' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_awaiting_approval'),
      (new.tenant_id, new.reservation_id, 'owner_approval_request')
    on conflict do nothing;
  elsif new.from_status is null and new.to_status = 'pending_payment' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_received'),
      (new.tenant_id, new.reservation_id, 'owner_new')
    on conflict do nothing;
  elsif new.from_status = 'awaiting_approval' and new.to_status = 'pending_payment' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_approved')
    on conflict do nothing;
  elsif (new.from_status is null or new.from_status in ('pending_payment', 'awaiting_approval'))
        and new.to_status = 'confirmed' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_confirmed')
    on conflict do nothing;
  elsif new.to_status = 'cancelled' and new.from_status is distinct from 'cancelled' then
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload) values
      (new.tenant_id, new.reservation_id, 'guest_cancelled', jsonb_build_object('reason', new.reason));
    if new.reason = 'payment_deadline_expired' then
      insert into public.email_outbox (tenant_id, reservation_id, kind) values
        (new.tenant_id, new.reservation_id, 'owner_expired')
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- reservation_by_token as in 20261016170000_reservation_functions.sql; changed (Z77): the way to pay, the deadline of
-- the approval, the payment to transfer is the open one (with a voucher only the rest).
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
               order by (pm.provider = 'recreation_voucher'), pm.created_at desc limit 1),
    'bank', (select jsonb_build_object('iban', s.iban, 'account_holder', s.account_holder, 'bic', s.bic)
             from public.tenant_settings s where s.tenant_id = r.tenant_id)
  )
  from public.reservations r
  join public.reservation_items i on i.reservation_id = r.id
  join public.properties p on p.id = r.property_id
  where r.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

-- One-off e-mails per reservation (as in 20261016230000_email_outbox.sql) + the four of the approval.
drop index public.email_outbox_once_idx;
create unique index email_outbox_once_idx on public.email_outbox (reservation_id, kind)
  where kind in ('guest_received', 'guest_reminder', 'guest_confirmed', 'guest_arrival', 'owner_new', 'owner_expired',
                 'guest_awaiting_approval', 'guest_approved', 'owner_approval_request', 'owner_approval_reminder');

-- New kinds of e-mail. The list is that of the latest migration (…19130000) + the new ones.
alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer', 'guest_message', 'owner_message', 'owner_monthly_report',
  'platform_support_request', 'guest_consent_request',
  'guest_awaiting_approval', 'guest_approved', 'owner_approval_request', 'owner_approval_reminder'));

-- New kind of notification: approval_request. The lists are those of the latest migration (…19120000) + the new one.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale', 'support_request', 'approval_request'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale', 'support_request', 'approval_request']::text[]);

revoke execute on function public.approve_reservation(uuid, jsonb), public.decline_reservation(uuid, text)
  from public, anon;
grant execute on function public.approve_reservation(uuid, jsonb), public.decline_reservation(uuid, text)
  to authenticated;
