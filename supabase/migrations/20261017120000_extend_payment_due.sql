-- "Predĺžiť splatnosť" in the reservation panel (Z23): staff move the payment deadline of a reservation that still
-- waits for payment, so it is not cancelled automatically. From the later of now and the current deadline.
create or replace function public.extend_payment_due(p_reservation_id uuid, p_hours integer default 24)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_status text;
  v_due timestamptz;
begin
  select tenant_id, status into v_tenant, v_status from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_status <> 'pending_payment' then
    raise exception 'reservation does not wait for payment' using errcode = '22023';
  end if;
  if p_hours is null or p_hours < 1 or p_hours > 336 then
    raise exception 'hours out of range' using errcode = '22023';
  end if;
  update public.reservations
  set payment_due_at = greatest(coalesce(payment_due_at, now()), now()) + make_interval(hours => p_hours)
  where id = p_reservation_id
  returning payment_due_at into v_due;
  return v_due;
end;
$$;

revoke execute on function public.extend_payment_due(uuid, integer) from public, anon;
grant execute on function public.extend_payment_due(uuid, integer) to authenticated;
