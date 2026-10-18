-- Z58: stays from portals (Booking, Airbnb, other iCal channels) on their own list and in Príchody. What a portal says
-- about its stay in the description — the link or code of the reservation and the last four digits of the guest's
-- phone (Airbnb) — is kept with the occupancy (the parser keeps nothing else of the description). Reservations are
-- listed by arrival by default (computed field for PostgREST ordering).

alter table public.occupancy add column ical_details jsonb
  check (ical_details is null or jsonb_typeof(ical_details) = 'object');

comment on column public.occupancy.ical_details is
  'From the portal''s event description: {url, code, phone4} — the reservation''s link/code, last 4 digits of the phone.';

-- ical_apply as in 20261017250000_collisions.sql; changed: the details of the event are stored (ical_details).
create or replace function public.ical_apply(p_channel_id uuid, p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel public.ical_channels;
  v_event jsonb;
  v_range daterange;
  v_existing public.occupancy;
  v_id uuid;
  v_added integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
  v_conflicts jsonb := '[]'::jsonb;
  v_uids text[] := array[]::text[];
begin
  select * into v_channel from public.ical_channels where id = p_channel_id;
  if v_channel.id is null then
    raise exception 'unknown channel' using errcode = '22023';
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    v_range := daterange((v_event ->> 'start')::date, (v_event ->> 'end')::date, '[)');
    continue when v_range is null or isempty(v_range) or upper(v_range) < current_date - 1;
    v_uids := v_uids || (v_event ->> 'uid');
    select * into v_existing from public.occupancy
    where ical_channel_id = p_channel_id and ical_uid = v_event ->> 'uid';

    if v_existing.id is not null and v_existing.nights = v_range and (v_existing.is_blocking or v_existing.conflict) then
      -- unchanged; a previous conflict may resolve itself once the other stay is gone; the portal's details follow
      if v_existing.ical_details is distinct from (v_event -> 'details') then
        update public.occupancy set ical_details = v_event -> 'details' where id = v_existing.id;
      end if;
      if v_existing.conflict then
        begin
          update public.occupancy set is_blocking = true, conflict = false where id = v_existing.id;
        exception when exclusion_violation then
          null;
        end;
      end if;
      continue;
    end if;

    begin
      if v_existing.id is not null then
        update public.occupancy
        set nights = v_range, is_blocking = true, conflict = false, label = left(v_event ->> 'summary', 120),
            ical_details = v_event -> 'details'
        where id = v_existing.id;
        v_updated := v_updated + 1;
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, ical_details)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120), v_event -> 'details');
        v_added := v_added + 1;
      end if;
    exception when exclusion_violation then
      -- Collision with a reservation or block: keep it as a visible, non-blocking conflict (A16).
      if v_existing.id is not null then
        update public.occupancy set nights = v_range, is_blocking = false, conflict = true,
            ical_details = v_event -> 'details' where id = v_existing.id;
        v_id := v_existing.id;
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, is_blocking,
                                      conflict, ical_details)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120), false, true, v_event -> 'details')
        returning id into v_id;
      end if;
      v_conflicts := v_conflicts || jsonb_build_object('id', v_id, 'start', lower(v_range), 'end', upper(v_range));
    end;
  end loop;

  -- Events that disappeared from the feed (cancelled on the channel) free the term.
  delete from public.occupancy
  where ical_channel_id = p_channel_id and not (ical_uid = any (v_uids));
  get diagnostics v_removed = row_count;

  update public.ical_channels
  set last_sync_at = now(), last_status = public.ical_channel_status(p_channel_id), last_error = null
  where id = p_channel_id;

  if jsonb_array_length(v_conflicts) > 0 then
    insert into public.email_outbox (tenant_id, kind, payload)
    values (v_channel.tenant_id, 'owner_ical_conflict',
            jsonb_build_object('channel_id', p_channel_id, 'channel', v_channel.name, 'conflicts', v_conflicts));
  end if;

  return jsonb_build_object('added', v_added, 'updated', v_updated, 'removed', v_removed, 'conflicts', v_conflicts);
end;
$$;

-- Order of the reservation list "by arrival" (Z58): stays now and coming first (the nearest on top), then past ones
-- (the latest on top). A computed field — PostgREST orders by it (`order=arrival_order`).
create or replace function public.arrival_order(r public.reservations)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when x.check_out >= current_date then x.check_in - current_date
    else 100000 + (current_date - x.check_out)
  end
  from (select min(i.check_in) as check_in, max(i.check_out) as check_out
        from public.reservation_items i where i.reservation_id = r.id) x;
$$;

grant execute on function public.arrival_order(public.reservations) to authenticated;
