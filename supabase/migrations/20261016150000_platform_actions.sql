-- Control center actions (A4). Each runs in one transaction and writes the audit log; only platform admins.

create or replace function public.platform_create_tenant(
  p_name text,
  p_slug text,
  p_hostname text,
  p_country char(2) default 'SK',
  p_currency char(3) default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.tenants (name, slug, country, currency, status)
  values (trim(p_name), lower(trim(p_slug)), upper(p_country), upper(p_currency), 'onboarding')
  returning id into v_id;

  insert into public.tenant_domains (tenant_id, hostname, is_primary)
  values (v_id, lower(trim(p_hostname)), true);

  insert into public.tenant_themes (tenant_id) values (v_id);

  perform public.write_audit(v_id, 'tenant.created', 'tenant', v_id::text,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'hostname', p_hostname));
  return v_id;
end;
$$;

create or replace function public.platform_set_module(
  p_tenant_id uuid,
  p_module_key text,
  p_status text,
  p_trial_ends_at date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object('status', status, 'trial_ends_at', trial_ends_at) into v_before
  from public.tenant_modules where tenant_id = p_tenant_id and module_key = p_module_key;

  insert into public.tenant_modules (tenant_id, module_key, status, trial_ends_at, updated_by)
  values (p_tenant_id, p_module_key, p_status,
    case when p_status = 'trial' then p_trial_ends_at end, (select auth.uid()))
  on conflict (tenant_id, module_key) do update
    set status = excluded.status, trial_ends_at = excluded.trial_ends_at, updated_by = excluded.updated_by;

  perform public.write_audit(p_tenant_id, 'module.changed', 'module', p_module_key,
    jsonb_build_object('before', v_before,
      'after', jsonb_build_object('status', p_status,
        'trial_ends_at', case when p_status = 'trial' then p_trial_ends_at end)));
end;
$$;

create or replace function public.platform_set_tenant_status(p_tenant_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before text;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select status into v_before from public.tenants where id = p_tenant_id;
  update public.tenants set status = p_status where id = p_tenant_id;
  perform public.write_audit(p_tenant_id, 'tenant.status_changed', 'tenant', p_tenant_id::text,
    jsonb_build_object('before', v_before, 'after', p_status));
end;
$$;

revoke execute on function public.platform_create_tenant(text, text, text, char, char),
  public.platform_set_module(uuid, text, text, date),
  public.platform_set_tenant_status(uuid, text) from public, anon, authenticated;
grant execute on function public.platform_create_tenant(text, text, text, char, char),
  public.platform_set_module(uuid, text, text, date),
  public.platform_set_tenant_status(uuid, text) to authenticated;
