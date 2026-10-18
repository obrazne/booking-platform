-- Z52 (3f, A9 layer 3): surgical restore of ONE client from a backup. `scripts/restore-tenant.mjs` reads the data of
-- the client from a decrypted backup (data.sql), stages it here, gets the plan (rows to add / change / delete per
-- table) and only after an explicit confirmation applies it in one transaction. Server key only (service_role);
-- nothing for clients or the platform admin in the browser.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Rows of the backup waiting for a plan or a restore (one session = one run of the script).
create table private.restore_rows (
  session uuid not null,
  table_name text not null,
  row jsonb,
  created_at timestamptz not null default now()
);
create index restore_rows_session_idx on private.restore_rows (session, table_name);

-- Tables the backup contained (also those with no row of the client — then the client's rows there are deleted).
create table private.restore_seen (
  session uuid not null,
  table_name text not null,
  primary key (session, table_name)
);

-- Tables of a client a restore covers: every table of `public` with tenant_id, without the technical ones (audit,
-- history, bell, e-mail queue, devices, attempts, people of the team, backups).
create or replace function public.restore_tables()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(c.table_name::text order by c.table_name), '{}')
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and c.column_name = 'tenant_id' and t.table_type = 'BASE TABLE'
    and c.table_name not in ('audit_log', 'record_history', 'notifications', 'email_outbox', 'push_subscriptions',
      'request_attempts', 'guest_auth_attempts', 'memberships', 'platform_backups');
$$;

create or replace function public.restore_stage(p_session uuid, p_table text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not (p_table = any (public.restore_tables())) then
    raise exception 'table % is not restored', p_table using errcode = '22023';
  end if;
  insert into private.restore_seen (session, table_name) values (p_session, p_table) on conflict do nothing;
  insert into private.restore_rows (session, table_name, row)
    select p_session, p_table, e.value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) e;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.restore_discard(p_session uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.restore_rows where session = p_session;
  delete from private.restore_seen where session = p_session;
$$;

-- Values of the backup come as text (COPY): json/jsonb text becomes JSON, the rest is cast by the column's type.
create or replace function public.restore_typed(p_table text, p_row jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key,
    case when c.data_type in ('json', 'jsonb') and jsonb_typeof(e.value) = 'string'
      then (e.value #>> '{}')::jsonb else e.value end), '{}'::jsonb)
  from jsonb_each(p_row) e
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = p_table and c.column_name = e.key;
$$;

-- The plan (p_apply false) or the restore (p_apply true, one transaction): per table the rows to add, change and
-- delete so the client's rows are exactly those of the backup. Triggers are off while writing (replica): no
-- e-mails, bell or history from the restore itself — it is recorded in the audit instead.
create or replace function public.restore_plan(p_session uuid, p_tenant uuid, p_apply boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text;
  v_pk text[];
  v_match text;
  v_key text;
  v_added integer;
  v_changed integer;
  v_deleted integer;
  v_samples jsonb;
  v_result jsonb := '{}'::jsonb;
begin
  if not exists (select 1 from public.tenants where id = p_tenant) then
    raise exception 'tenant % does not exist', p_tenant using errcode = '22023';
  end if;
  if p_apply then
    set local session_replication_role = replica;
  end if;
  for v_table in
    select s.table_name from private.restore_seen s where s.session = p_session order by s.table_name
  loop
    select array_agg(a.attname::text order by array_position(i.indkey::int2[], a.attnum))
      into v_pk
      from pg_index i
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
      where i.indrelid = format('public.%I', v_table)::regclass and i.indisprimary;
    if v_pk is null then
      raise exception 'table % has no primary key', v_table;
    end if;
    select string_agg(format('x.%1$I is not distinct from s.%1$I', k), ' and '),
           string_agg(format('x.%I::text', k), ' || '':'' || ')
      into v_match, v_key from unnest(v_pk) k;

    drop table if exists pg_temp.restore_src;
    execute format(
      'create temp table restore_src as select * from jsonb_populate_recordset(null::public.%I, '
      || '(select coalesce(jsonb_agg(public.restore_typed(%L, r.row)), ''[]''::jsonb) from private.restore_rows r '
      || 'where r.session = $1 and r.table_name = %L)) where tenant_id = $2', v_table, v_table, v_table)
      using p_session, p_tenant;

    execute format('select count(*) from pg_temp.restore_src s where not exists '
      || '(select 1 from public.%I x where %s)', v_table, v_match) into v_added;
    execute format('select count(*) from public.%I x where x.tenant_id = $1 and not exists '
      || '(select 1 from pg_temp.restore_src s where %s)', v_table, v_match) into v_deleted using p_tenant;
    execute format('select count(*) from pg_temp.restore_src s join public.%I x on %s '
      || 'where to_jsonb(s) is distinct from to_jsonb(x)', v_table, v_match) into v_changed;

    if v_added + v_changed + v_deleted > 0 then
      execute format(
        'select jsonb_build_object('
        || '''add'', (select coalesce(jsonb_agg(k), ''[]'') from (select %2$s as k from pg_temp.restore_src x '
        || '  where not exists (select 1 from public.%1$I s where %3$s) limit 5) a), '
        || '''change'', (select coalesce(jsonb_agg(k), ''[]'') from (select %2$s as k from public.%1$I x '
        || '  join pg_temp.restore_src s on %3$s where to_jsonb(s) is distinct from to_jsonb(x) limit 5) c), '
        || '''delete'', (select coalesce(jsonb_agg(k), ''[]'') from (select %2$s as k from public.%1$I x '
        || '  where x.tenant_id = $1 and not exists (select 1 from pg_temp.restore_src s where %3$s) limit 5) d))',
        v_table, v_key, v_match) into v_samples using p_tenant;
      v_result := v_result || jsonb_build_object(v_table, jsonb_build_object(
        'add', v_added, 'change', v_changed, 'delete', v_deleted, 'samples', v_samples));
    end if;

    if p_apply and v_added + v_changed + v_deleted > 0 then
      -- Deleted and changed rows go out, then the rows of the backup that are not there come in.
      execute format('delete from public.%I x where x.tenant_id = $1 and not exists '
        || '(select 1 from pg_temp.restore_src s where %s)', v_table, v_match) using p_tenant;
      execute format('delete from public.%I x using pg_temp.restore_src s where %s '
        || 'and to_jsonb(s) is distinct from to_jsonb(x)', v_table, v_match);
      execute format('insert into public.%I overriding system value select * from pg_temp.restore_src s '
        || 'where not exists (select 1 from public.%I x where %s)', v_table, v_table, v_match);
    end if;
    drop table pg_temp.restore_src;
  end loop;

  if p_apply then
    insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
      values (p_tenant, null, 'tenant.restored', 'tenant', p_tenant::text, v_result);
    perform public.restore_discard(p_session);
  end if;
  return v_result;
end;
$$;

revoke execute on function public.restore_tables(), public.restore_stage(uuid, text, jsonb),
  public.restore_discard(uuid), public.restore_typed(text, jsonb), public.restore_plan(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.restore_tables(), public.restore_stage(uuid, text, jsonb),
  public.restore_discard(uuid), public.restore_typed(text, jsonb), public.restore_plan(uuid, uuid, boolean)
  to service_role;

-- Staged rows of a run that never finished are dropped after a day.
select cron.schedule('restore-rows-cleanup', '23 3 * * *',
  $$delete from private.restore_rows where created_at < now() - interval '1 day';
    delete from private.restore_seen s where not exists (select 1 from private.restore_rows r where r.session = s.session)$$);
