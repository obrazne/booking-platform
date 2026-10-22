-- Z81 (A10): the licence of a client = the record of the contract in the platform admin (not a key to the
-- application). Only adds:
--   * tenant_licenses: one per client (number = the number in the contract, package Základ / Bez starostí + modules,
--     the fees, 2 % of the turnover, start, the annual contract until, the state active / overdue / suspended);
--   * a suspended licence: no new reservations (guest and by hand) and no holds; the administration of the client is
--     read only — a guard on the tables of the client refuses writes of its team (guests with a reservation, the
--     e-mails and the synchronisation keep working). tenants.status stays as it was (suspended = the site is hidden);
--   * tenant_license_turnover: the turnover of a month by A10 (direct stays without the tax and the deposit, confirmed
--     orders of services, the kept part of cancelled reservations) — the base of the 2 %.

create table public.tenant_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  number text not null unique check (length(number) between 1 and 40),
  package text not null default 'basic' check (package in ('basic', 'carefree')),
  -- Modules sold on top of Základ (Bez starostí has all).
  modules text[] not null default '{}',
  -- Properties covered; empty = all properties of the client.
  property_ids uuid[] not null default '{}',
  setup_fee_cents integer not null default 99000 check (setup_fee_cents >= 0),
  monthly_fee_cents integer not null default 15000 check (monthly_fee_cents >= 0),
  turnover_bp integer not null default 200 check (turnover_bp between 0 and 10000),
  starts_on date not null default current_date,
  contract_until date,
  state text not null default 'active' check (state in ('active', 'overdue', 'suspended')),
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contract_until is null or contract_until >= starts_on)
);

comment on table public.tenant_licenses is
  'Z81: the licence of a client (contract record, A10) — state by payments; suspended = no new reservations, admin read only.';

alter table public.tenant_licenses enable row level security;
grant select on public.tenant_licenses to authenticated;
-- The platform admin sees all; the team of the client its own (number, package, validity). Writes only through
-- platform_save_license.
create policy tenant_licenses_read on public.tenant_licenses for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

-- Is the licence of the client suspended?
create or replace function public.tenant_license_suspended(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tenant_licenses l where l.tenant_id = p_tenant_id and l.state = 'suspended');
$$;

-- Read only for the team of a client with a suspended licence (the platform admin, guests and the system pass).
create or replace function public.tenant_write_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := (coalesce(to_jsonb(new), to_jsonb(old)) ->> 'tenant_id')::uuid;
begin
  if v_tenant is not null and (select auth.uid()) is not null
     and public.tenant_license_suspended(v_tenant)
     and public.is_tenant_member(v_tenant) and not public.is_platform_admin() then
    raise exception 'licence suspended' using errcode = 'LIC01';
  end if;
  return coalesce(new, old);
end;
$$;

-- On every table of a client except logs, the platform's own tables and what must keep working (help, push).
do $$
declare
  t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'tenant_id' and tb.table_type = 'BASE TABLE'
      and c.table_name not in (
        'record_history', 'audit_log', 'notifications', 'email_outbox', 'request_attempts', 'guest_auth_attempts',
        'guest_consent_events', 'reservation_counters', 'reservation_status_history', 'push_subscriptions',
        'help_feedback', 'support_requests', 'widget_stats', 'tenant_licenses')
  loop
    execute format(
      'create trigger tenant_write_guard before insert or update or delete on public.%I
         for each row execute function public.tenant_write_guard()', t);
  end loop;
end;
$$;

-- No new reservations (from the guest page by the server key, or by hand) and no holds of a term.
create or replace function public.license_booking_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.tenant_license_suspended(new.tenant_id) then
    raise exception 'licence suspended' using errcode = 'LIC01';
  end if;
  return new;
end;
$$;

create trigger license_booking_guard before insert on public.reservations
  for each row when (new.source in ('direct', 'manual')) execute function public.license_booking_guard();
create trigger license_hold_guard before insert on public.occupancy
  for each row when (new.kind = 'hold') execute function public.license_booking_guard();

-- Platform admin: save the licence (one per client); the change and the state go to the audit.
create or replace function public.platform_save_license(p_tenant_id uuid, p jsonb)
returns public.tenant_licenses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.tenant_licenses;
  v_row public.tenant_licenses;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_before from public.tenant_licenses where tenant_id = p_tenant_id;
  insert into public.tenant_licenses (tenant_id, number, package, modules, property_ids, setup_fee_cents,
    monthly_fee_cents, turnover_bp, starts_on, contract_until, state, note)
  values (p_tenant_id, trim(p ->> 'number'), coalesce(p ->> 'package', 'basic'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'modules') x), '{}'),
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'property_ids') x), '{}'),
    coalesce((p ->> 'setup_fee_cents')::integer, 99000), coalesce((p ->> 'monthly_fee_cents')::integer, 15000),
    coalesce((p ->> 'turnover_bp')::integer, 200), coalesce((p ->> 'starts_on')::date, current_date),
    (p ->> 'contract_until')::date, coalesce(p ->> 'state', 'active'), nullif(trim(p ->> 'note'), ''))
  on conflict (tenant_id) do update set
    number = excluded.number, package = excluded.package, modules = excluded.modules,
    property_ids = excluded.property_ids, setup_fee_cents = excluded.setup_fee_cents,
    monthly_fee_cents = excluded.monthly_fee_cents, turnover_bp = excluded.turnover_bp,
    starts_on = excluded.starts_on, contract_until = excluded.contract_until, state = excluded.state,
    note = excluded.note, updated_at = now()
  returning * into v_row;
  perform public.write_audit(p_tenant_id, 'license.saved', 'license', v_row.number,
    jsonb_build_object('before', to_jsonb(v_before) - 'created_at' - 'updated_at',
                       'after', to_jsonb(v_row) - 'created_at' - 'updated_at'));
  if v_before.state is distinct from v_row.state then
    perform public.write_audit(p_tenant_id, 'license.state_changed', 'license', v_row.number,
      jsonb_build_object('before', v_before.state, 'after', v_row.state));
  end if;
  return v_row;
end;
$$;

-- The turnover of a month by A10 — the base of the percentage. Direct stays: as Štatistiky (by the nights, without
-- the tax and the deposit, confirmed and later). Services ordered later: confirmed orders by the day of the service.
-- Cancelled reservations: what was paid and not refunded (the kept fee), at most the price, in the month cancelled.
-- Portal stays and blocks are never in reservations.
create or replace function public.tenant_license_turnover(p_tenant_id uuid, p_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_m date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_tz text;
  v_stays bigint;
  v_orders bigint;
  v_kept bigint;
begin
  if not (public.is_platform_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(t.timezone, 'Europe/Bratislava') into v_tz from public.tenants t where t.id = p_tenant_id;
  v_tz := coalesce(v_tz, 'Europe/Bratislava');
  select coalesce(sum(s.revenue_cents), 0) into v_stays
    from public.tenant_monthly_stats(p_tenant_id, v_m, v_m) s;
  select coalesce(sum(o.amount_cents), 0) into v_orders
    from public.reservation_orders o
    where o.tenant_id = p_tenant_id and o.status = 'confirmed'
      and coalesce(o.service_date, (o.created_at at time zone v_tz)::date) >= v_m
      and coalesce(o.service_date, (o.created_at at time zone v_tz)::date) < v_end;
  select coalesce(sum(least(k.paid, k.price)), 0) into v_kept from (
    select r.id,
      (select coalesce(sum(p.amount_cents), 0) from public.payments p
        where p.reservation_id = r.id and p.purpose = 'reservation' and p.status = 'received'
          and p.provider <> 'gift_voucher') as paid,
      r.total_cents - (select coalesce(sum(l.amount_cents), 0) from public.reservation_lines l
        where l.reservation_id = r.id and l.kind in ('tax', 'deposit')) as price
    from public.reservations r
    where r.tenant_id = p_tenant_id and r.status = 'cancelled' and r.source in ('direct', 'manual')
      and exists (select 1 from public.reservation_status_history h
                  where h.reservation_id = r.id and h.to_status = 'cancelled'
                    and (h.changed_at at time zone v_tz)::date >= v_m
                    and (h.changed_at at time zone v_tz)::date < v_end)
  ) k;
  return jsonb_build_object('month', v_m, 'stays_cents', v_stays, 'orders_cents', v_orders, 'kept_cents', v_kept,
    'total_cents', v_stays + v_orders + v_kept);
end;
$$;

revoke execute on function public.platform_save_license(uuid, jsonb), public.tenant_license_turnover(uuid, date)
  from public, anon;
grant execute on function public.platform_save_license(uuid, jsonb), public.tenant_license_turnover(uuid, date)
  to authenticated, service_role;
revoke execute on function public.tenant_write_guard(), public.license_booking_guard() from public, anon, authenticated;
