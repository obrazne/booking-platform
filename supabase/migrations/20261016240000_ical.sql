-- iCal (B2, A16): export per unit through its secret token, import of channel calendars applied atomically.
-- A collision never overwrites anything: the event is stored as a non-blocking conflict and the owner is notified.

alter table public.ical_channels add column export_excluded boolean not null default true;
comment on column public.ical_channels.export_excluded is
  'This channel gets its own export URL without its own events (prevents echo loops).';

-- Export: blocking nights of a unit for calendar apps; no guest data, only "busy".
create or replace function public.ical_export(p_token text, p_exclude_channel uuid default null)
returns table (uid text, nights daterange, kind text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(o.ical_uid, o.id::text), o.nights, o.kind
  from public.units u
  join public.occupancy o on o.unit_id = u.id
  where u.ical_export_token = p_token
    and o.is_blocking
    and o.kind in ('reservation', 'block', 'ical')
    and (p_exclude_channel is null or o.ical_channel_id is distinct from p_exclude_channel)
    and upper(o.nights) >= (now() at time zone 'UTC')::date - 30;
$$;

-- Import: replaces the channel's events with the given list in one transaction.
-- p_events: [{uid, start (date), end (date, exclusive), summary}]
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
      -- unchanged; a previous conflict may resolve itself once the other stay is gone
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
        set nights = v_range, is_blocking = true, conflict = false, label = left(v_event ->> 'summary', 120)
        where id = v_existing.id;
        v_updated := v_updated + 1;
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120));
        v_added := v_added + 1;
      end if;
    exception when exclusion_violation then
      -- Collision with a reservation or block: keep it as a visible, non-blocking conflict (A16).
      if v_existing.id is not null then
        update public.occupancy set nights = v_range, is_blocking = false, conflict = true where id = v_existing.id;
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, is_blocking, conflict)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120), false, true);
      end if;
      v_conflicts := v_conflicts || jsonb_build_object('start', lower(v_range), 'end', upper(v_range));
    end;
  end loop;

  -- Events that disappeared from the feed (cancelled on the channel) free the term.
  delete from public.occupancy
  where ical_channel_id = p_channel_id and not (ical_uid = any (v_uids));
  get diagnostics v_removed = row_count;

  update public.ical_channels
  set last_sync_at = now(),
      last_status = case when exists (select 1 from public.occupancy where ical_channel_id = p_channel_id and conflict)
                         then 'conflict' else 'ok' end,
      last_error = null
  where id = p_channel_id;

  if jsonb_array_length(v_conflicts) > 0 then
    insert into public.email_outbox (tenant_id, kind, payload)
    values (v_channel.tenant_id, 'owner_ical_conflict',
            jsonb_build_object('channel_id', p_channel_id, 'channel', v_channel.name, 'conflicts', v_conflicts));
  end if;

  return jsonb_build_object('added', v_added, 'updated', v_updated, 'removed', v_removed, 'conflicts', v_conflicts);
end;
$$;

create or replace function public.ical_mark_error(p_channel_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ical_channels set last_sync_at = now(), last_status = 'error', last_error = left(p_error, 500)
  where id = p_channel_id;
$$;

-- A conflict mail is queued only for new or changed colliding events, not on every sync.
revoke execute on function public.ical_export(text, uuid), public.ical_apply(uuid, jsonb),
  public.ical_mark_error(uuid, text) from public, anon, authenticated;
grant execute on function public.ical_export(text, uuid) to anon, authenticated;
grant execute on function public.ical_apply(uuid, jsonb), public.ical_mark_error(uuid, text) to service_role;
