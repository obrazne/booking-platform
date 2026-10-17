-- Collisions of calendars (Z42, pripomienka 29): the owner sees what collides with what in a panel and marks it
-- as resolved. A collision is an iCal event kept as a non-blocking row (occupancy.conflict, A16, 20261016240000_ical).
-- Resolved = stays in history, the bell notification goes away, the channel is no longer "kolízia"; only a change
-- of the dates (or a new collision of the same event) opens it again.

alter table public.occupancy
  add column conflict_detected_at timestamptz,
  add column conflict_resolved_at timestamptz,
  add column conflict_resolved_by uuid references public.profiles (id) on delete set null;

comment on column public.occupancy.conflict_resolved_at is
  'The owner marked the collision as resolved; cleared when the dates of the event change (Z42).';

-- Collisions that existed before: detected when the row was created.
update public.occupancy set conflict_detected_at = created_at where conflict;

create index occupancy_open_conflicts_idx on public.occupancy (tenant_id)
  where conflict and conflict_resolved_at is null;

-- Detected now when the row becomes a collision or its dates change; a row that is no collision has no resolution.
-- An unchanged event (the sync skips it) keeps the resolution.
create or replace function public.occupancy_conflict_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.conflict then
    new.conflict_detected_at := null;
    new.conflict_resolved_at := null;
    new.conflict_resolved_by := null;
  elsif tg_op = 'INSERT' or not old.conflict or new.nights is distinct from old.nights then
    new.conflict_detected_at := now();
    new.conflict_resolved_at := null;
    new.conflict_resolved_by := null;
  end if;
  return new;
end;
$$;

create trigger occupancy_conflict_state before insert or update of conflict, nights on public.occupancy
  for each row execute function public.occupancy_conflict_state();

-- The bell (and the push) opens the panel of the collision; it rings again when the dates of a collision change.
create or replace function public.notify_portal_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel record;
  v_data jsonb;
  v_month text := to_char(lower(new.nights), 'YYYY-MM');
begin
  if new.kind <> 'ical' or new.ical_channel_id is null then
    return new;
  end if;
  select name, source, last_sync_at into v_channel from public.ical_channels where id = new.ical_channel_id;
  v_data := jsonb_build_object('channel', v_channel.name, 'source', v_channel.source,
    'check_in', lower(new.nights), 'check_out', upper(new.nights));
  if new.conflict and (tg_op = 'INSERT' or not old.conflict or new.nights is distinct from old.nights) then
    perform public.notify(new.tenant_id, 'tenant', 'calendar_conflict', v_data,
      '/admin/collisions?panel=collision:' || new.id,
      'calendar_conflict:' || new.id || ':' || lower(new.nights) || ':' || upper(new.nights));
  elsif tg_op = 'INSERT' and new.is_blocking and v_channel.last_sync_at is not null
        and upper(new.nights) > current_date then
    perform public.notify(new.tenant_id, 'tenant', 'portal_booking', v_data,
      '/admin/calendar?month=' || v_month, 'portal_booking:' || new.id);
  end if;
  return new;
end;
$$;

drop trigger occupancy_notify on public.occupancy;
create trigger occupancy_notify after insert or update of conflict, nights on public.occupancy
  for each row execute function public.notify_portal_occupancy();

-- Notifications of collisions already in the bell open the panel too.
update public.notifications
set target = '/admin/collisions?panel=collision:' || split_part(dedupe_key, ':', 2)
where kind = 'calendar_conflict' and split_part(dedupe_key, ':', 2) ~ '^[0-9a-f-]{36}$';

-- State of a channel: "kolízia" only while some collision of it is not resolved.
create or replace function public.ical_channel_status(p_channel_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (select 1 from public.occupancy
                           where ical_channel_id = p_channel_id and conflict and conflict_resolved_at is null)
         then 'conflict' else 'ok' end;
$$;

-- ical_apply as in 20261016240000_ical.sql; changed: the state of the channel ignores resolved collisions and the
-- collisions it reports carry the id of the row (the e-mail links to its panel).
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
        v_id := v_existing.id;
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, is_blocking, conflict)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120), false, true)
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

-- The team marks a collision as resolved (or opens it again): written into the audit, the bell notification goes
-- away, the state of the channel follows.
create or replace function public.resolve_conflict(p_occupancy_id uuid, p_resolved boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.occupancy;
begin
  select * into v_row from public.occupancy where id = p_occupancy_id for update;
  if not found or not public.is_tenant_staff(v_row.tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not v_row.conflict then
    raise exception 'not_a_conflict' using errcode = 'P0001';
  end if;
  update public.occupancy
  set conflict_resolved_at = case when p_resolved then now() end,
      conflict_resolved_by = case when p_resolved then auth.uid() end
  where id = p_occupancy_id;
  if p_resolved then
    delete from public.notifications
    where tenant_id = v_row.tenant_id and dedupe_key like 'calendar_conflict:' || p_occupancy_id || ':%';
  end if;
  update public.ical_channels set last_status = public.ical_channel_status(id)
  where id = v_row.ical_channel_id and last_status in ('ok', 'conflict');
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
  values (v_row.tenant_id, auth.uid(), case when p_resolved then 'conflict.resolved' else 'conflict.reopened' end,
    'occupancy', p_occupancy_id::text,
    jsonb_build_object('check_in', lower(v_row.nights), 'check_out', upper(v_row.nights),
      'channel_id', v_row.ical_channel_id));
end;
$$;

-- Channels whose collisions were all resolved before (none yet) keep their state; recompute once.
update public.ical_channels c set last_status = public.ical_channel_status(c.id) where c.last_status = 'conflict';

revoke execute on function public.occupancy_conflict_state() from public, anon, authenticated;
revoke execute on function public.ical_channel_status(uuid), public.resolve_conflict(uuid, boolean) from public, anon;
grant execute on function public.resolve_conflict(uuid, boolean) to authenticated;
grant execute on function public.ical_channel_status(uuid) to service_role;
