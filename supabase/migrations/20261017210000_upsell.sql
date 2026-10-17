-- Upsell (module `upsell`, needs `services`; Z35, B11): ordering a service after the reservation was made — from
-- confirmation until departure, bindingly. Orders are their own table: the frozen price lines of the reservation
-- (reservation_lines, B1) never change. The price of an order is frozen when it is placed (cents, currency, VAT,
-- quantity by the price model of the service — the same rule as the cart: modelQuantity in src/core/pricing).
--
-- Payment: "na účet pobytu" (settled at departure — on site or by transfer, up to a limit per client), transfer now,
-- card later (Stripe). The stay account of a reservation = its orders; "Vyúčtovať" records one payment
-- (payments.purpose = 'stay_account') and marks the open orders as paid.
--
-- Guests reach their orders through the account (RLS) or the access link (functions that verify the token).

insert into public.modules (key) values ('upsell') on conflict do nothing;

-- Settings of a service for ordering after the reservation.
alter table public.services
  add column upsell_enabled boolean not null default false,
  add column upsell_cutoff_hours smallint not null default 24 check (upsell_cutoff_hours between 0 and 720),
  add column upsell_requires_confirmation boolean not null default false,
  add column upsell_stay_account boolean not null default true;

comment on column public.services.upsell_cutoff_hours is
  'Orders close this many hours before the day of the service (or before arrival when the order has no date).';

alter table public.tenant_settings
  add column stay_account_limit_cents integer not null default 30000 check (stay_account_limit_cents >= 0);

comment on column public.tenant_settings.stay_account_limit_cents is
  'Most a guest may have open on the stay account; above it only payment in advance.';

-- What a payment is for: the reservation itself, or settling the stay account (orders).
alter table public.payments
  add column purpose text not null default 'reservation' check (purpose in ('reservation', 'stay_account'));

create table public.reservation_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  -- Frozen at ordering (the service may change or disappear later).
  label text not null check (length(label) between 1 and 200),
  price_model text not null check (price_model in ('per_stay', 'per_night', 'per_person', 'per_person_night', 'per_item')),
  items smallint not null default 1 check (items between 1 and 100),
  quantity integer not null check (quantity >= 1),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null,
  vat_bp integer not null default 0 check (vat_bp between 0 and 10000),
  service_date date,
  cutoff_at timestamptz not null,
  payment_method text not null check (payment_method in ('stay_account', 'transfer', 'card')),
  status text not null default 'confirmed'
    check (status in ('ordered', 'awaiting_confirmation', 'confirmed', 'declined', 'cancelled')),
  decline_reason text check (length(decline_reason) <= 500),
  note text check (length(note) <= 500),
  ordered_via text not null check (ordered_via in ('account', 'link', 'staff')),
  ordered_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  paid_at timestamptz,
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_cents = unit_amount_cents * quantity)
);

comment on table public.reservation_orders is
  'Services ordered after the reservation (upsell, B11) with a frozen price; the stay account of the reservation.';

create index reservation_orders_reservation_idx on public.reservation_orders (reservation_id, created_at);
create index reservation_orders_tenant_status_idx on public.reservation_orders (tenant_id, status);

create trigger reservation_orders_set_updated_at before update on public.reservation_orders
  for each row execute function public.set_updated_at();
create trigger record_history after insert or update or delete on public.reservation_orders
  for each row execute function public.record_history_capture('id');

alter table public.reservation_orders enable row level security;
revoke all on public.reservation_orders from anon, authenticated;
grant select on public.reservation_orders to authenticated;

-- The team of the client, and the guest of the reservation in their account. Writes only through the functions.
create policy reservation_orders_select on public.reservation_orders for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or (select public.is_platform_admin())
    or exists (select 1 from public.reservations r where r.id = reservation_id
               and r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Access and the stay account
-- ---------------------------------------------------------------------------

-- 'staff' | 'account' | 'link' | null — how the caller may act on the reservation.
create or replace function public.reservation_access(p_reservation_id uuid, p_token text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_tenant_staff(r.tenant_id) then 'staff'
    when r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id) then 'account'
    when p_token is not null and r.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') then 'link'
    end
  from public.reservations r where r.id = p_reservation_id;
$$;

-- Total, paid and open of the stay account (orders that count: not declined, not cancelled) and the client's limit.
create or replace function public.stay_account(p_reservation_id uuid, p_token text default null)
returns table (currency text, total_cents integer, paid_cents integer, open_cents integer,
  open_on_account_cents integer, limit_cents integer, orders integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.reservation_access(p_reservation_id, p_token) is null and auth.role() <> 'service_role' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select r.currency::text,
    coalesce(sum(o.amount_cents) filter (where o.status in ('ordered', 'awaiting_confirmation', 'confirmed')), 0)::int,
    coalesce(sum(o.amount_cents) filter (where o.paid_at is not null), 0)::int,
    coalesce(sum(o.amount_cents) filter (where o.status in ('ordered', 'awaiting_confirmation', 'confirmed')
      and o.paid_at is null), 0)::int,
    coalesce(sum(o.amount_cents) filter (where o.status in ('ordered', 'awaiting_confirmation', 'confirmed')
      and o.paid_at is null and o.payment_method = 'stay_account'), 0)::int,
    coalesce((select s.stay_account_limit_cents from public.tenant_settings s where s.tenant_id = r.tenant_id), 30000),
    count(o.id) filter (where o.status in ('ordered', 'awaiting_confirmation', 'confirmed'))::int
  from public.reservations r
  left join public.reservation_orders o on o.reservation_id = r.id
  where r.id = p_reservation_id
  group by r.id, r.currency, r.tenant_id;
end;
$$;

-- Orders of a reservation for the access link (the account reads them through RLS).
create or replace function public.reservation_orders_for(p_reservation_id uuid, p_token text default null)
returns setof public.reservation_orders
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.reservation_access(p_reservation_id, p_token) is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query select * from public.reservation_orders where reservation_id = p_reservation_id order by created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ordering
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_reservation_id uuid, p_service_id uuid, p_items integer default 1, p_service_date date default null,
  p_payment_method text default 'stay_account', p_note text default null, p_token text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
  v_svc record;
  v_check_in date;
  v_check_out date;
  v_today date;
  v_cutoff timestamptz;
  v_items integer;
  v_qty integer;
  v_amount integer;
  v_account record;
  v_status text;
  v_label text;
  v_id uuid;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.id, r.tenant_id, r.property_id, r.status, r.currency, r.locale, r.adults, r.children, t.timezone
  into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id
  where r.id = p_reservation_id;
  if not (public.is_module_enabled(v_res.tenant_id, 'upsell') and public.is_module_enabled(v_res.tenant_id, 'services')) then
    raise exception 'module_off' using errcode = 'P0001';
  end if;
  if v_res.status not in ('confirmed', 'in_progress') then
    raise exception 'not_confirmed' using errcode = 'P0001';
  end if;
  select min(i.check_in), max(i.check_out) into v_check_in, v_check_out
  from public.reservation_items i where i.reservation_id = p_reservation_id;
  v_today := (now() at time zone v_res.timezone)::date;
  if v_today > v_check_out then
    raise exception 'departed' using errcode = 'P0001';
  end if;
  select * into v_svc from public.services s
  where s.id = p_service_id and s.tenant_id = v_res.tenant_id and s.active and s.upsell_enabled
    and (s.property_id is null or s.property_id = v_res.property_id);
  if not found then
    raise exception 'service_unavailable' using errcode = 'P0001';
  end if;
  if p_service_date is not null and (p_service_date < v_check_in or p_service_date > v_check_out) then
    raise exception 'date_outside_stay' using errcode = 'P0001';
  end if;
  v_cutoff := (coalesce(p_service_date, v_check_in)::timestamp at time zone v_res.timezone)
    - make_interval(hours => v_svc.upsell_cutoff_hours);
  if now() > v_cutoff and v_via <> 'staff' then
    raise exception 'cutoff_passed' using errcode = 'P0001';
  end if;
  v_items := greatest(1, least(coalesce(p_items, 1), coalesce(v_svc.max_quantity, 100)));
  v_qty := case v_svc.price_model
    when 'per_night' then (v_check_out - v_check_in) * v_items
    when 'per_person' then (v_res.adults + v_res.children) * v_items
    when 'per_person_night' then (v_res.adults + v_res.children) * (v_check_out - v_check_in) * v_items
    else v_items end;
  v_amount := v_svc.amount_cents * v_qty;
  if p_payment_method = 'card' then
    raise exception 'card_unavailable' using errcode = 'P0001';
  elsif p_payment_method = 'stay_account' then
    if not v_svc.upsell_stay_account then
      raise exception 'stay_account_not_allowed' using errcode = 'P0001';
    end if;
    select * into v_account from public.stay_account(p_reservation_id, p_token);
    if v_account.open_on_account_cents + v_amount > v_account.limit_cents then
      raise exception 'over_limit' using errcode = 'P0001';
    end if;
  elsif p_payment_method is distinct from 'transfer' then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;
  v_status := case when v_svc.upsell_requires_confirmation then 'awaiting_confirmation' else 'confirmed' end;
  v_label := left(coalesce(v_svc.name ->> v_res.locale, v_svc.name ->> 'sk',
    (select value from jsonb_each_text(v_svc.name) limit 1), '—'), 200);
  insert into public.reservation_orders (tenant_id, reservation_id, service_id, label, price_model, items, quantity,
    unit_amount_cents, amount_cents, currency, vat_bp, service_date, cutoff_at, payment_method, status, note,
    ordered_via, ordered_by)
  values (v_res.tenant_id, p_reservation_id, v_svc.id, v_label, v_svc.price_model, v_items, v_qty,
    v_svc.amount_cents, v_amount, v_res.currency, v_svc.vat_bp, p_service_date, v_cutoff, p_payment_method, v_status,
    nullif(left(btrim(p_note), 500), ''), v_via, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Guest cancels until the cutoff (not after it is paid).
create or replace function public.cancel_order(p_order_id uuid, p_token text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_via text;
begin
  select * into v_order from public.reservation_orders where id = p_order_id for update;
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_via := public.reservation_access(v_order.reservation_id, p_token);
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_order.status not in ('ordered', 'awaiting_confirmation', 'confirmed') or v_order.paid_at is not null then
    raise exception 'not_cancellable' using errcode = 'P0001';
  end if;
  if now() > v_order.cutoff_at and v_via <> 'staff' then
    raise exception 'cutoff_passed' using errcode = 'P0001';
  end if;
  update public.reservation_orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
end;
$$;

-- Owner confirms or declines (with a reason) an order.
create or replace function public.decide_order(p_order_id uuid, p_confirm boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
begin
  select * into v_order from public.reservation_orders where id = p_order_id for update;
  if not found or not public.is_tenant_staff(v_order.tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_confirm then
    if v_order.status not in ('ordered', 'awaiting_confirmation') then
      raise exception 'not_waiting' using errcode = 'P0001';
    end if;
    update public.reservation_orders set status = 'confirmed', decided_at = now(), decided_by = auth.uid()
    where id = p_order_id;
  else
    if v_order.status not in ('ordered', 'awaiting_confirmation', 'confirmed') or v_order.paid_at is not null then
      raise exception 'not_declinable' using errcode = 'P0001';
    end if;
    if coalesce(btrim(p_reason), '') = '' then
      raise exception 'reason_required' using errcode = '22023';
    end if;
    update public.reservation_orders
    set status = 'declined', decline_reason = left(btrim(p_reason), 500), decided_at = now(), decided_by = auth.uid()
    where id = p_order_id;
  end if;
end;
$$;

-- "Vyúčtovať": one payment for everything open (confirmed, unpaid), on site or by transfer.
create or replace function public.settle_stay_account(p_reservation_id uuid, p_provider text default 'on_site')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_sum integer;
  v_payment uuid;
begin
  select id, tenant_id, currency into v_res from public.reservations where id = p_reservation_id;
  if not found or not public.is_tenant_staff(v_res.tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_provider not in ('on_site', 'bank_transfer') then
    raise exception 'invalid_provider' using errcode = '22023';
  end if;
  select coalesce(sum(amount_cents), 0) into v_sum from public.reservation_orders
  where reservation_id = p_reservation_id and status = 'confirmed' and paid_at is null;
  if v_sum = 0 then
    raise exception 'nothing_to_settle' using errcode = 'P0001';
  end if;
  insert into public.payments (tenant_id, reservation_id, provider, amount_cents, currency, status, received_at,
    received_by, purpose)
  values (v_res.tenant_id, p_reservation_id, p_provider, v_sum, v_res.currency, 'received', now(), auth.uid(),
    'stay_account')
  returning id into v_payment;
  update public.reservation_orders set paid_at = now(), payment_id = v_payment
  where reservation_id = p_reservation_id and status = 'confirmed' and paid_at is null;
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- E-mails to the guest and notifications for the team
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined'));

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting']::text[]);

create or replace function public.order_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_target text := '/admin/reservations?panel=reservation:' || new.reservation_id;
begin
  if tg_op = 'INSERT' then
    v_data := public.reservation_notice(new.reservation_id) || jsonb_build_object('service', new.label,
      'order_cents', new.amount_cents, 'service_date', new.service_date);
    -- The team member who ordered for the guest does not need to be told.
    perform public.notify(new.tenant_id, 'tenant',
      case when new.status = 'awaiting_confirmation' then 'order_awaiting' else 'order_new' end,
      v_data, v_target, 'order:' || new.id,
      case when new.ordered_via = 'staff' then new.ordered_by end);
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
    values (new.tenant_id, new.reservation_id, 'guest_order_received', jsonb_build_object('order_id', new.id));
  elsif new.status is distinct from old.status and old.status in ('ordered', 'awaiting_confirmation', 'confirmed') then
    if new.status = 'confirmed' then
      insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
      values (new.tenant_id, new.reservation_id, 'guest_order_confirmed', jsonb_build_object('order_id', new.id));
    elsif new.status = 'declined' then
      insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
      values (new.tenant_id, new.reservation_id, 'guest_order_declined', jsonb_build_object('order_id', new.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger reservation_orders_events after insert or update of status on public.reservation_orders
  for each row execute function public.order_events();

revoke execute on function public.order_events() from public, anon, authenticated;
revoke execute on function public.reservation_access(uuid, text), public.stay_account(uuid, text),
  public.reservation_orders_for(uuid, text), public.place_order(uuid, uuid, integer, date, text, text, text),
  public.cancel_order(uuid, text), public.decide_order(uuid, boolean, text), public.settle_stay_account(uuid, text)
  from public;
grant execute on function public.stay_account(uuid, text), public.reservation_orders_for(uuid, text),
  public.place_order(uuid, uuid, integer, date, text, text, text), public.cancel_order(uuid, text)
  to anon, authenticated, service_role;
grant execute on function public.decide_order(uuid, boolean, text), public.settle_stay_account(uuid, text)
  to authenticated;
grant execute on function public.reservation_access(uuid, text) to service_role;
