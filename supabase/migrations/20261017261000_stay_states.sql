-- States of the guest's stay (Z44, design v2.4 `StavyPobytu`): arrival instructions as tiles (door code, Wi-Fi from
-- the property's private data), when the instructions unlock and why, and what happened with a cancelled stay.

alter table public.property_private
  add column door_code text check (length(door_code) <= 40),
  add column wifi_name text check (length(wifi_name) <= 60),
  add column wifi_password text check (length(wifi_password) <= 60);

comment on column public.property_private.door_code is
  'Code of the door / key box. Private: only for the guest of a stay whose arrival instructions are unlocked.';

-- What the guest's stay page needs about its state, for the account (RLS of the guest) and the access link (token):
--   arrival: {visible, from (date the instructions unlock), needs_payment, needs_checkin, check_in_from, check_out_until,
--             instructions, door_code, wifi_name, wifi_password — the private part only when visible}
--   cancelled_at, cancelled_reason, refunded_cents (payments marked refunded)
create or replace function public.guest_stay_state(p_reservation_id uuid, p_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v record;
  v_visible boolean;
  v_needs_checkin boolean;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.id, r.tenant_id, r.status, r.cancelled_reason, p.check_in_from, p.check_out_until,
    p.checkin_required_for_instructions, coalesce(s.arrival_email_days_before, 3) as days_before,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id) as check_in,
    pp.arrival_instructions, pp.door_code, pp.wifi_name, pp.wifi_password
  into v
  from public.reservations r
  join public.properties p on p.id = r.property_id
  left join public.property_private pp on pp.property_id = r.property_id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  where r.id = p_reservation_id;
  v_visible := public.arrival_instructions_visible(p_reservation_id);
  v_needs_checkin := v.checkin_required_for_instructions and public.is_module_enabled(v.tenant_id, 'checkin')
    and not exists (select 1 from public.checkins c where c.reservation_id = p_reservation_id and c.status = 'completed');
  return jsonb_build_object(
    'arrival', jsonb_build_object(
      'visible', v_visible,
      'from', v.check_in - v.days_before,
      'needs_payment', v.status = 'pending_payment',
      'needs_checkin', v_needs_checkin,
      'check_in_from', to_char(v.check_in_from, 'HH24:MI'),
      'check_out_until', to_char(v.check_out_until, 'HH24:MI'),
      'instructions', case when v_visible then v.arrival_instructions end,
      'door_code', case when v_visible then v.door_code end,
      'wifi_name', case when v_visible then v.wifi_name end,
      'wifi_password', case when v_visible then v.wifi_password end),
    'cancelled_at', case when v.status = 'cancelled' then (
      select max(h.changed_at) from public.reservation_status_history h
      where h.reservation_id = p_reservation_id and h.to_status = 'cancelled') end,
    'cancelled_reason', case when v.status = 'cancelled' then v.cancelled_reason end,
    'refunded_cents', coalesce((select sum(pay.amount_cents) from public.payments pay
      where pay.reservation_id = p_reservation_id and pay.status = 'refunded'), 0));
end;
$$;

revoke execute on function public.guest_stay_state(uuid, text) from public;
grant execute on function public.guest_stay_state(uuid, text) to anon, authenticated, service_role;
