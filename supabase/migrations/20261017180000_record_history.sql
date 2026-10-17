-- History of changes and the trash (Z31, ARCHITEKTURA A9 — "Vrátenie chyby jedného klienta", layers 1 and 2).
-- Clients share one database, so a mistake of one client is never fixed by restoring everything: every change in
-- a client's data is written here (table, record, before/after, who, when), the owner restores deleted things for
-- 30 days, the platform admin reverts a specific change. Only adds — no existing data changes.

create table public.record_history (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  table_name text not null,
  -- Primary key of the record: values joined by "/" (readable), and as an object (to find the row again).
  record_id text not null,
  pk jsonb not null,
  op text not null check (op in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  changed_by uuid,
  -- user = staff of the client or the platform admin; guest = the guest in their zone or booking; system = jobs, iCal, triggers.
  source text not null check (source in ('user', 'guest', 'system')),
  -- One database transaction (deleting a season deletes its date ranges and prices in the same one).
  tx_id bigint not null default txid_current(),
  changed_at timestamptz not null default now(),
  -- Files of deleted photos and documents are removed from storage only after 30 days (the trash).
  files_purged_at timestamptz
);

comment on table public.record_history is
  'Every change in a client''s data (Z31). Read only by the platform admin; owners use the trash functions.';

create index record_history_record_idx on public.record_history (tenant_id, table_name, record_id, changed_at desc);
create index record_history_tenant_changed_idx on public.record_history (tenant_id, changed_at desc);
create index record_history_tx_idx on public.record_history (tx_id);

alter table public.record_history enable row level security;
revoke all on public.record_history from anon, authenticated;
grant select on public.record_history to authenticated;
create policy record_history_select on public.record_history for select to authenticated
  using ((select public.is_platform_admin()));

-- Columns whose change alone is not worth a history entry (synchronisation bookkeeping, timestamps).
create or replace function public.history_noise(p_row jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_row, '{}'::jsonb) - 'updated_at' - 'last_sync_at' - 'last_status' - 'last_error';
$$;

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
  if v_tenant is null or (tg_table_name = 'occupancy' and v_row ->> 'kind' = 'hold') then
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

-- The trigger on every table with tenant_id, except the history itself and technical logs.
do $$
declare
  t text;
  pk_cols text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'tenant_id' and tb.table_type = 'BASE TABLE'
      and c.table_name not in (
        'record_history', 'audit_log', 'notifications', 'email_outbox', 'request_attempts', 'guest_auth_attempts',
        'guest_consent_events', 'reservation_counters', 'reservation_status_history')
  loop
    select string_agg(quote_literal(a.attname), ', ' order by array_position(i.indkey, a.attnum))
      into pk_cols
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = format('public.%I', t)::regclass and i.indisprimary;
    execute format(
      'create trigger record_history after insert or update or delete on public.%I
         for each row execute function public.record_history_capture(%s)', t, pk_cols);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Restoring rows from the history
-- ---------------------------------------------------------------------------

-- Columns that can be written back (no generated or identity-always columns).
create or replace function public.history_columns(p_table text)
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  from information_schema.columns
  where table_schema = 'public' and table_name = p_table
    and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS';
$$;

-- WHERE clause for the record's primary key.
create or replace function public.history_pk_where(p_pk jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(format('%I::text = %L', key, value #>> '{}'), ' and ')
  from jsonb_each(p_pk);
$$;

create or replace function public.history_current(p_table text, p_pk jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  execute format('select to_jsonb(t) from public.%I t where %s', p_table, public.history_pk_where(p_pk)) into v;
  return v;
end;
$$;

-- Puts back the deleted record and the rows that went with it: deleted in the same transaction and pointing to an
-- already restored row (a season → its date ranges and prices), parents first. iCal events that went with a calendar
-- are left to the next synchronisation. Errors become readable codes and nothing is restored then.
create or replace function public.history_restore_deleted(p_entry public.record_history)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.record_history;
  v_cols text;
  v_done bigint[] := array[]::bigint[];
  v_ids text[] := array[]::text[];
begin
  r := p_entry;
  loop
    if public.history_current(r.table_name, r.pk) is null then
      v_cols := public.history_columns(r.table_name);
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
        r.table_name, v_cols, v_cols, r.table_name) using r.old_row;
    end if;
    v_done := v_done || r.id;
    v_ids := v_ids || (r.old_row ->> 'id');
    select * into r from public.record_history c
    where c.tenant_id = p_entry.tenant_id and c.tx_id = p_entry.tx_id and c.op = 'delete'
      and c.id <> all (v_done)
      and not (c.table_name = 'occupancy' and c.old_row ->> 'kind' = 'ical')
      and exists (select 1 from jsonb_each_text(c.old_row) e where e.key <> 'id' and e.value = any (v_ids))
    order by c.id
    limit 1;
    exit when not found;
  end loop;
  return 'ok';
exception
  when exclusion_violation then return 'conflict';
  when foreign_key_violation then return 'missing_parent';
  when unique_violation then return 'exists';
  when check_violation then return 'invalid';
end;
$$;

-- What the owner may restore (Z31): these kinds of records, deleted in the last 30 days.
create or replace function public.trash_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['services', 'seasons', 'fees', 'discounts', 'photos', 'property_sections', 'documents', 'occupancy',
               'ical_channels', 'property_places'];
$$;

create or replace function public.owner_trash(p_tenant_id uuid)
returns table (id bigint, table_name text, label text, deleted_at timestamptz, deleted_by text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_tenant_owner(p_tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select h.id, h.table_name,
         coalesce(
           h.old_row -> 'name' ->> 'sk', h.old_row ->> 'name', h.old_row -> 'title' ->> 'sk', h.old_row ->> 'label',
           h.old_row ->> 'alt', h.old_row ->> 'type', h.old_row ->> 'storage_path', h.record_id),
         h.changed_at,
         (select coalesce(p.full_name, p.email) from public.profiles p where p.id = h.changed_by)
  from public.record_history h
  where h.tenant_id = p_tenant_id and h.op = 'delete' and h.table_name = any (public.trash_tables())
    and h.changed_at > now() - interval '30 days'
    and not (h.table_name = 'occupancy' and h.old_row ->> 'kind' <> 'block')
    -- Only the record the owner deleted, not rows that went with it (they come back with it).
    and not exists (
      select 1 from public.record_history p
      where p.tx_id = h.tx_id and p.tenant_id = h.tenant_id and p.op = 'delete' and p.id < h.id
        and exists (select 1 from jsonb_each_text(h.old_row) e where e.key <> 'id' and e.value = p.old_row ->> 'id'))
    and public.history_current(h.table_name, h.pk) is null
  order by h.changed_at desc
  limit 200;
end;
$$;

create or replace function public.owner_restore(p_history_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.record_history;
  v_result text;
begin
  select * into h from public.record_history where id = p_history_id;
  if h.id is null or not public.is_tenant_owner(h.tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if h.op <> 'delete' or not h.table_name = any (public.trash_tables()) or h.changed_at < now() - interval '30 days' then
    return 'expired';
  end if;
  if public.history_current(h.table_name, h.pk) is not null then
    return 'exists';
  end if;
  v_result := public.history_restore_deleted(h);
  if v_result = 'ok' then
    perform public.write_audit(h.tenant_id, 'trash.restored', h.table_name, h.record_id, '{}'::jsonb);
  end if;
  return v_result;
end;
$$;

-- Platform admin: revert one change (Z31). Without p_force, a record that changed again since is not touched —
-- the answer says so and shows the current state.
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

-- ---------------------------------------------------------------------------
-- Keeping the history (180 days) and forgetting a guest
-- ---------------------------------------------------------------------------

-- Guest anonymisation (when it is built) calls this: the guest's rows leave the history too.
create or replace function public.forget_guest_history(p_tenant_id uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.record_history
  where tenant_id = p_tenant_id
    and (old_row ->> 'guest_email' = p_email or new_row ->> 'guest_email' = p_email
         or old_row ->> 'email' = p_email or new_row ->> 'email' = p_email);
  get diagnostics n = row_count;
  return n;
end;
$$;

select cron.schedule('record-history-retention', '17 3 * * *',
  $$delete from public.record_history where changed_at < now() - interval '180 days'$$);

revoke execute on function public.record_history_capture(), public.history_restore_deleted(public.record_history),
  public.history_current(text, jsonb), public.forget_guest_history(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.owner_trash(uuid), public.owner_restore(bigint),
  public.platform_revert_change(bigint, boolean) from public, anon;
grant execute on function public.owner_trash(uuid), public.owner_restore(bigint),
  public.platform_revert_change(bigint, boolean) to authenticated;
grant execute on function public.forget_guest_history(uuid, text) to service_role;
