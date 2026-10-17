-- Upsell for guests (Z37, B11, design v2.3 `UcetPobyt`): ordering on chosen days of the stay and offers by e-mail
-- before arrival. The base (orders, stay account, place_order) is in 20261017210000_upsell.sql.

-- Days before arrival when the guest gets an e-mail with the services they can still order (client setting).
alter table public.tenant_settings
  add column upsell_offer_days smallint[] not null default '{7,2}'
    check (cardinality(upsell_offer_days) <= 3 and 1 <= all (upsell_offer_days) and 30 >= all (upsell_offer_days));

comment on column public.tenant_settings.upsell_offer_days is
  'Days before arrival with an e-mail offering services to order (upsell); empty = no offers.';

-- An order for one day of the stay: a service priced per night (breakfast, sauna…) counts that one night,
-- not the whole stay. Without a date the rule stays as in the cart (modelQuantity). Otherwise unchanged.
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
  v_nights integer;
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
  v_nights := case when p_service_date is not null then 1 else v_check_out - v_check_in end;
  v_items := greatest(1, least(coalesce(p_items, 1), coalesce(v_svc.max_quantity, 100)));
  v_qty := case v_svc.price_model
    when 'per_night' then v_nights * v_items
    when 'per_person' then (v_res.adults + v_res.children) * v_items
    when 'per_person_night' then (v_res.adults + v_res.children) * v_nights * v_items
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

-- One tap for several days (breakfast on three mornings): an order per day, all or nothing (one transaction —
-- the limit of the stay account counts the days ordered before in the same call).
create or replace function public.place_orders(
  p_reservation_id uuid, p_service_id uuid, p_dates date[] default null, p_items integer default 1,
  p_payment_method text default 'stay_account', p_note text default null, p_token text default null)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := '{}';
  v_date date;
begin
  if p_dates is null or cardinality(p_dates) = 0 then
    return array[public.place_order(p_reservation_id, p_service_id, p_items, null, p_payment_method, p_note, p_token)];
  end if;
  if cardinality(p_dates) > 31 then
    raise exception 'too_many_days' using errcode = '22023';
  end if;
  for v_date in select distinct d from unnest(p_dates) d order by d loop
    v_ids := v_ids || public.place_order(p_reservation_id, p_service_id, p_items, v_date, p_payment_method, p_note,
      p_token);
  end loop;
  return v_ids;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offers by e-mail before arrival
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer'));
create unique index email_outbox_upsell_offer_once_idx on public.email_outbox (reservation_id, kind, (payload ->> 'days'))
  where kind = 'guest_upsell_offer';

-- Hourly: on the days set by the client, an e-mail with what the guest can still order (at least one service of
-- the property open for ordering — before its cutoff on the day of arrival, or a service for the days of the stay).
-- Sent from 9:00 of the tenant's time. Portal reservations (Booking, Airbnb) do not get it — no guest e-mail.
create or replace function public.upsell_tick()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offers integer;
begin
  insert into public.email_outbox (tenant_id, reservation_id, kind, payload, send_after)
  select r.tenant_id, r.id, 'guest_upsell_offer', jsonb_build_object('days', x.check_in - x.today),
    greatest(now(), (x.today + time '09:00') at time zone t.timezone)
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out,
                  (now() at time zone t.timezone)::date as today
                from public.reservation_items i where i.reservation_id = r.id) x on true
  where r.status = 'confirmed' and r.source not in ('booking', 'airbnb') and r.guest_email is not null
    and (x.check_in - x.today) = any (coalesce(s.upsell_offer_days, '{7,2}'))
    and public.is_module_enabled(r.tenant_id, 'upsell') and public.is_module_enabled(r.tenant_id, 'services')
    and exists (
      select 1 from public.services v
      where v.tenant_id = r.tenant_id and v.active and v.upsell_enabled
        and (v.property_id is null or v.property_id = r.property_id)
        and ((case when v.price_model in ('per_night', 'per_person_night') then x.check_out else x.check_in end)
          ::timestamp at time zone t.timezone) - make_interval(hours => v.upsell_cutoff_hours) > now())
  on conflict do nothing;
  get diagnostics v_offers = row_count;
  return v_offers;
end;
$$;

select cron.schedule('upsell-tick', '23 * * * *', $$select public.upsell_tick()$$);

revoke execute on function public.upsell_tick() from public, anon, authenticated;
revoke execute on function public.place_orders(uuid, uuid, date[], integer, text, text, text) from public;
grant execute on function public.place_orders(uuid, uuid, date[], integer, text, text, text)
  to anon, authenticated, service_role;
