-- Guests could not read catalogue terms: the policy queried public.tenants, which anonymous users cannot read.
-- The tenant check now goes through a narrow SECURITY DEFINER helper.
create or replace function public.is_active_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant_id and t.status <> 'suspended');
$$;

revoke execute on function public.is_active_tenant(uuid) from public, anon, authenticated;
grant execute on function public.is_active_tenant(uuid) to anon, authenticated;

drop policy terms_select_public on public.terms;
create policy terms_select_public on public.terms for select to anon, authenticated
  using (tenant_id is null or public.is_active_tenant(tenant_id));
