-- Scheduled job (B5): every 5 minutes cancel reservations whose payment deadline passed, free the term,
-- and drop expired holds. Runs in the database (pg_cron), independent of the web app.
create extension if not exists pg_cron;

select cron.schedule(
  'expire-pending-reservations',
  '*/5 * * * *',
  $$select public.expire_pending_reservations()$$
);

-- Staff: create the manual reservation through the same function as guests (server checks membership first),
-- add internal notes; owners and reception may change a confirmed stay to in progress / completed.
create or replace function public.set_reservation_progress(p_reservation_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  if p_status not in ('in_progress', 'completed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select tenant_id into v_tenant from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.change_reservation_status(p_reservation_id, p_status, (select auth.uid()), null);
end;
$$;

-- Owner declines a guest's cancellation request (keeps the reservation, clears the request with a note in history).
create or replace function public.dismiss_cancellation_request(p_reservation_id uuid)
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
  update public.reservations set cancellation_requested_at = null where id = p_reservation_id;
  insert into public.reservation_status_history (tenant_id, reservation_id, from_status, to_status, changed_by, reason)
  values (v_tenant, p_reservation_id, v_status, v_status, (select auth.uid()), 'cancellation_request_declined');
end;
$$;

revoke execute on function public.set_reservation_progress(uuid, text), public.dismiss_cancellation_request(uuid)
  from public, anon, authenticated;
grant execute on function public.set_reservation_progress(uuid, text), public.dismiss_cancellation_request(uuid)
  to authenticated;
