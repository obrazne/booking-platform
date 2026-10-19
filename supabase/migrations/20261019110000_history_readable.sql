-- Z64: a readable history of changes (pripomienka 45). Only adds to Z31 (record_history):
--   * occupancy written by the synchronisation of portal calendars is no longer recorded row by row — ical_apply writes
--     one summary per run of a channel (table_name 'ical_sync': added / updated / removed, the events in detail);
--   * `is_sync` marks those entries (and the old row-by-row ones) so the history hides them by default;
--   * "Vrátiť túto zmenu" only for changes made by people (also checked here).

alter table public.record_history add column is_sync boolean generated always as (
  table_name = 'ical_sync'
  or (table_name = 'occupancy' and source = 'system' and coalesce(new_row ->> 'kind', old_row ->> 'kind') = 'ical')
) stored;

create index record_history_tenant_sync_idx on public.record_history (tenant_id, is_sync, changed_at desc);

-- record_history_capture as in 20261017180000_record_history.sql; changed: iCal occupancy of the synchronisation skipped.
create or replace function public.record_history_capture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_pk jsonb := '{}'::jsonb;
  v_col text;
  v_user uuid := (select auth.uid());
  v_tenant uuid := (v_row ->> 'tenant_id')::uuid;
begin
  -- Shared records without a client (platform-wide terms) and temporary holds of a term are not data of a client.
  -- Z64: occupancy from the synchronisation of portal calendars (iCal, no user) is summed up once per run of the
  -- channel by ical_apply (table 'ical_sync'), not row by row.
  if v_tenant is null or (tg_table_name = 'occupancy' and v_row ->> 'kind' = 'hold')
     or (tg_table_name = 'occupancy' and v_row ->> 'kind' = 'ical' and v_user is null) then
    return null;
  end if;
  if tg_op = 'UPDATE' and public.history_noise(v_old) = public.history_noise(v_new) then
    return null;
  end if;
  foreach v_col in array tg_argv loop
    v_pk := v_pk || jsonb_build_object(v_col, v_row -> v_col);
  end loop;
  insert into public.record_history (tenant_id, table_name, record_id, pk, op, old_row, new_row, changed_by, source)
  values (
    v_tenant, tg_table_name,
    (select string_agg(value #>> '{}', '/' order by ordinality) from jsonb_each(v_pk) with ordinality),
    v_pk, lower(tg_op), v_old, v_new, v_user,
    case
      when v_user is null then 'system'
      when public.is_tenant_staff(v_tenant) then 'user'
      else 'guest'
    end);
  return null;
end;
$$;

-- ical_apply as in 20261018150000_portal_stays.sql; changed: one summary entry of the history per run.
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
  -- What changed, for the one summary entry of the history (Z64).
  v_detail jsonb := '[]'::jsonb;
  v_removed_detail jsonb;
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
        v_detail := v_detail || jsonb_build_object('op', 'update', 'start', lower(v_range), 'end', upper(v_range),
          'label', left(v_event ->> 'summary', 120), 'before_start', lower(v_existing.nights),
          'before_end', upper(v_existing.nights));
      else
        insert into public.occupancy (tenant_id, unit_id, nights, kind, ical_channel_id, ical_uid, label, ical_details)
        values (v_channel.tenant_id, v_channel.unit_id, v_range, 'ical', p_channel_id, v_event ->> 'uid',
                left(v_event ->> 'summary', 120), v_event -> 'details');
        v_added := v_added + 1;
        v_detail := v_detail || jsonb_build_object('op', 'add', 'start', lower(v_range), 'end', upper(v_range),
          'label', left(v_event ->> 'summary', 120));
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
      v_detail := v_detail || jsonb_build_object('op', 'conflict', 'start', lower(v_range), 'end', upper(v_range),
        'label', left(v_event ->> 'summary', 120));
    end;
  end loop;

  -- Events that disappeared from the feed (cancelled on the channel) free the term.
  select coalesce(jsonb_agg(jsonb_build_object('op', 'remove', 'start', lower(o.nights), 'end', upper(o.nights),
           'label', o.label) order by lower(o.nights)), '[]'::jsonb)
    into v_removed_detail
    from public.occupancy o
    where o.ical_channel_id = p_channel_id and not (o.ical_uid = any (v_uids));
  delete from public.occupancy
  where ical_channel_id = p_channel_id and not (ical_uid = any (v_uids));
  get diagnostics v_removed = row_count;

  update public.ical_channels
  set last_sync_at = now(), last_status = public.ical_channel_status(p_channel_id), last_error = null
  where id = p_channel_id;

  -- One readable entry of the history per run that changed something (Z64): "Airbnb: 1 pridané, 1 zmazané…".
  v_detail := v_detail || v_removed_detail;
  if jsonb_array_length(v_detail) > 0 then
    insert into public.record_history (tenant_id, table_name, record_id, pk, op, old_row, new_row, changed_by, source)
    values (v_channel.tenant_id, 'ical_sync', p_channel_id::text, jsonb_build_object('id', p_channel_id), 'update',
      null,
      jsonb_build_object('channel', v_channel.name, 'source', v_channel.source, 'added', v_added,
        'updated', v_updated, 'removed', v_removed, 'conflicts', jsonb_array_length(v_conflicts),
        'events', (select coalesce(jsonb_agg(e), '[]'::jsonb) from (
                     select e from jsonb_array_elements(v_detail) e limit 200) x)),
      null, 'system');
  end if;

  if jsonb_array_length(v_conflicts) > 0 then
    insert into public.email_outbox (tenant_id, kind, payload)
    values (v_channel.tenant_id, 'owner_ical_conflict',
            jsonb_build_object('channel_id', p_channel_id, 'channel', v_channel.name, 'conflicts', v_conflicts));
  end if;

  return jsonb_build_object('added', v_added, 'updated', v_updated, 'removed', v_removed, 'conflicts', v_conflicts);
end;
$$;

-- platform_revert_change as in 20261017180000_record_history.sql; changed: people's changes only.
create or replace function public.platform_revert_change(p_history_id bigint, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.record_history;
  v_current jsonb;
  v_cols text;
  v_result text := 'ok';
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into h from public.record_history where id = p_history_id;
  if h.id is null then
    raise exception 'unknown change' using errcode = '22023';
  end if;
  -- Z64: only changes made by people are reverted — not the system, the synchronisation or guests.
  if h.source <> 'user' or h.table_name = 'ical_sync' then
    raise exception 'only changes made by people' using errcode = '22023';
  end if;
  v_current := public.history_current(h.table_name, h.pk);

  if h.op = 'delete' then
    if v_current is not null then
      return jsonb_build_object('status', 'exists', 'current', v_current);
    end if;
    v_result := public.history_restore_deleted(h);
  else
    if v_current is null then
      return jsonb_build_object('status', 'gone');
    end if;
    if not p_force and public.history_noise(v_current) <> public.history_noise(h.new_row) then
      return jsonb_build_object('status', 'changed', 'current', v_current);
    end if;
    begin
      if h.op = 'insert' then
        execute format('delete from public.%I where %s', h.table_name, public.history_pk_where(h.pk));
      else
        v_cols := public.history_columns(h.table_name);
        execute format('update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where %s',
          h.table_name, v_cols, v_cols, h.table_name, public.history_pk_where(h.pk)) using h.old_row;
      end if;
    exception
      when exclusion_violation then v_result := 'conflict';
      when foreign_key_violation then v_result := 'missing_parent';
      when unique_violation then v_result := 'exists';
      when check_violation then v_result := 'invalid';
    end;
  end if;
  if v_result = 'ok' then
    perform public.write_audit(h.tenant_id, 'history.reverted', h.table_name, h.record_id,
      jsonb_build_object('change', h.id, 'op', h.op));
  end if;
  return jsonb_build_object('status', v_result);
end;
$$;
