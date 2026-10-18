-- Z52: restore of chosen records only (p_ids) — e.g. one deleted reservation with its items, lines and payments —
-- without touching anything else of the client. A full restore (p_ids null) puts the client back to the moment of the
-- backup and so also undoes everything done since (found in the test on 18. 10.: concurrent test data came back).
-- With p_ids a table takes part only when it has `id` or `reservation_id`, and only rows whose id or reservation_id is
-- in the list are compared (in the backup and now).

drop function if exists public.restore_plan(uuid, uuid, boolean);

create or replace function public.restore_plan(
  p_session uuid, p_tenant uuid, p_apply boolean default false, p_ids text[] default null)
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
  v_scope_x text;
  v_scope_s text;
  v_cols text[];
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
    -- Scope: all rows of the client, or only those of the chosen records.
    v_scope_x := 'true';
    v_scope_s := 'true';
    if p_ids is not null then
      select array_agg(c.column_name::text) into v_cols
        from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = v_table and c.column_name in ('id', 'reservation_id');
      continue when v_cols is null;
      select string_agg(format('x.%I::text = any ($3)', c), ' or '), string_agg(format('s.%I::text = any ($3)', c), ' or ')
        into v_scope_x, v_scope_s from unnest(v_cols) c;
      v_scope_x := '(' || v_scope_x || ')';
      v_scope_s := '(' || v_scope_s || ')';
    end if;

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
      || 'where r.session = $1 and r.table_name = %L)) s where s.tenant_id = $2 and %s',
      v_table, v_table, v_table, v_scope_s)
      using p_session, p_tenant, p_ids;

    execute format('select count(*) from pg_temp.restore_src s where not exists '
      || '(select 1 from public.%I x where %s)', v_table, v_match) into v_added;
    execute format('select count(*) from public.%I x where x.tenant_id = $1 and %s and not exists '
      || '(select 1 from pg_temp.restore_src s where %s)', v_table, v_scope_x, v_match)
      into v_deleted using p_tenant, p_session, p_ids;
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
        || '  where x.tenant_id = $1 and %4$s and not exists (select 1 from pg_temp.restore_src s where %3$s) limit 5) d))',
        v_table, v_key, v_match, v_scope_x) into v_samples using p_tenant, p_session, p_ids;
      v_result := v_result || jsonb_build_object(v_table, jsonb_build_object(
        'add', v_added, 'change', v_changed, 'delete', v_deleted, 'samples', v_samples));
    end if;

    if p_apply and v_added + v_changed + v_deleted > 0 then
      execute format('delete from public.%I x where x.tenant_id = $1 and %s and not exists '
        || '(select 1 from pg_temp.restore_src s where %s)', v_table, v_scope_x, v_match) using p_tenant, p_session, p_ids;
      execute format('delete from public.%I x using pg_temp.restore_src s where %s '
        || 'and to_jsonb(s) is distinct from to_jsonb(x)', v_table, v_match);
      execute format('insert into public.%I overriding system value select * from pg_temp.restore_src s '
        || 'where not exists (select 1 from public.%I x where %s)', v_table, v_table, v_match);
    end if;
    drop table pg_temp.restore_src;
  end loop;

  if p_apply then
    insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
      values (p_tenant, null, 'tenant.restored', 'tenant', p_tenant::text,
        v_result || jsonb_build_object('_ids', to_jsonb(p_ids)));
    perform public.restore_discard(p_session);
  end if;
  return v_result;
end;
$$;

revoke execute on function public.restore_plan(uuid, uuid, boolean, text[]) from public, anon, authenticated;
grant execute on function public.restore_plan(uuid, uuid, boolean, text[]) to service_role;
