-- Online check-in for guests (Z39, design v2.3 `Checkin`): what the guest sees of their check-in (sensitive fields
-- masked) and saving again without retyping them. The base is in 20261017220000_checkin.sql.

-- The check-in of a stay for the guest (account or access link): state, persons with the document number and
-- the date of birth only as "saved" (never sent back), and what is still missing.
create or replace function public.guest_checkin_view(p_reservation_id uuid, p_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
  v_checkin record;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.tenant_id, r.adults, r.children, r.infants, r.guest_name, t.country, t.timezone,
    p.checkin_opens_days_before, p.checkin_required_for_instructions, p.check_in_from,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id) as check_in
  into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id
  join public.properties p on p.id = r.property_id
  where r.id = p_reservation_id;
  select * into v_checkin from public.checkins where reservation_id = p_reservation_id;
  return jsonb_build_object(
    'window', public.checkin_window(p_reservation_id),
    'status', coalesce(v_checkin.status, 'not_started'),
    'arrival_time', v_checkin.arrival_time,
    'house_rules_accepted', v_checkin.house_rules_accepted_at is not null,
    'completed_at', v_checkin.completed_at,
    -- The guest may change the data until the day of arrival (also after completing).
    'editable', (now() at time zone v_res.timezone)::date <= v_res.check_in,
    'opens_on', v_res.check_in - v_res.checkin_opens_days_before,
    'required_for_instructions', v_res.checkin_required_for_instructions,
    'check_in_from', v_res.check_in_from,
    'expected', v_res.adults + v_res.children + v_res.infants,
    'country', coalesce(v_res.country, 'SK'),
    'missing', case when v_checkin.id is null then '[]'::jsonb else public.checkin_missing(p_reservation_id) end,
    'persons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'first_name', g.first_name, 'last_name', g.last_name, 'is_citizen', g.is_citizen,
        'nationality', g.nationality, 'document_type', g.document_type, 'address', g.address,
        'document_masked', case when g.document_number is null then null
          else repeat('•', 4) || right(g.document_number, 2) end,
        'has_birth_date', g.birth_date is not null) order by g.sort)
      from public.checkin_guests g where g.reservation_id = p_reservation_id), '[]'::jsonb));
end;
$$;

-- Saving again: a person sent with the id of a saved person keeps the document number and the date of birth when
-- they are not sent (the guest sees them masked), and keeps the record that the owner reported the foreigner.
-- The guest may change a completed check-in until the day of arrival; it is then completed again.
create or replace function public.save_checkin(p_reservation_id uuid, p_data jsonb, p_token text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
  v_checkin record;
  v_id uuid;
  v_state text;
  v_old jsonb;
  v_prev jsonb;
  g jsonb;
  i integer := 0;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_state := public.checkin_window(p_reservation_id);
  if v_state <> 'ok' and not (v_via = 'staff' and v_state not in ('module_off')) then
    raise exception '%', v_state using errcode = 'P0001';
  end if;
  select r.id, r.tenant_id, t.timezone,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id) as check_in
  into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id where r.id = p_reservation_id;
  select * into v_checkin from public.checkins where reservation_id = p_reservation_id for update;
  if found and v_checkin.status = 'completed' and v_via <> 'staff'
     and (now() at time zone v_res.timezone)::date > v_res.check_in then
    raise exception 'completed' using errcode = 'P0001';
  end if;
  insert into public.checkins (tenant_id, reservation_id, status, arrival_time, house_rules_accepted_at)
  values (v_res.tenant_id, p_reservation_id, 'in_progress', nullif(p_data ->> 'arrival_time', ''),
    case when (p_data ->> 'house_rules_accepted')::boolean then now() end)
  on conflict (reservation_id) do update set
    arrival_time = excluded.arrival_time,
    house_rules_accepted_at = case when (p_data ->> 'house_rules_accepted')::boolean
      then coalesce(public.checkins.house_rules_accepted_at, now()) end,
    -- A guest's change reopens the check-in (complete_checkin closes it again); the team's change does not.
    status = case when v_via = 'staff' then public.checkins.status else 'in_progress' end
  returning id into v_id;
  if p_data ? 'guests' then
    if jsonb_array_length(p_data -> 'guests') > 30 then
      raise exception 'too_many' using errcode = '22023';
    end if;
    select coalesce(jsonb_object_agg(id::text, jsonb_build_object('document_number', document_number,
      'birth_date', birth_date, 'reported_at', reported_at, 'reported_by', reported_by, 'purged_at', purged_at)), '{}')
    into v_old
    from public.checkin_guests where reservation_id = p_reservation_id;
    delete from public.checkin_guests where reservation_id = p_reservation_id;
    for g in select * from jsonb_array_elements(p_data -> 'guests') loop
      v_prev := v_old -> (g ->> 'id');
      insert into public.checkin_guests (tenant_id, reservation_id, sort, first_name, last_name, is_citizen,
        nationality, birth_date, document_type, document_number, address, reported_at, reported_by, purged_at)
      values (v_res.tenant_id, p_reservation_id, i, btrim(g ->> 'first_name'), btrim(g ->> 'last_name'),
        coalesce((g ->> 'is_citizen')::boolean, true),
        case when coalesce((g ->> 'is_citizen')::boolean, true) then 'SK' else upper(nullif(g ->> 'nationality', '')) end,
        coalesce(
          case when nullif(g ->> 'birth_date', '')::date > current_date then null
            else nullif(g ->> 'birth_date', '')::date end,
          (v_prev ->> 'birth_date')::date),
        nullif(g ->> 'document_type', ''),
        coalesce(nullif(upper(regexp_replace(coalesce(g ->> 'document_number', ''), '\s', '', 'g')), ''),
          v_prev ->> 'document_number'),
        nullif(btrim(g ->> 'address'), ''),
        (v_prev ->> 'reported_at')::timestamptz, (v_prev ->> 'reported_by')::uuid, (v_prev ->> 'purged_at')::timestamptz);
      i := i + 1;
    end loop;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.guest_checkin_view(uuid, text) from public;
grant execute on function public.guest_checkin_view(uuid, text) to anon, authenticated, service_role;
