-- Modules and per-tenant switches (A3). The catalogue lives in code (src/modules); this table mirrors the keys
-- so switches can reference them. Turning a module off hides it and stops new actions; it never deletes data.

create table public.modules (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  created_at timestamptz not null default now()
);

comment on table public.modules is 'Known module keys (catalogue is defined in code).';

create table public.tenant_modules (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module_key text not null references public.modules (key),
  status text not null default 'off' check (status in ('trial', 'active', 'off')),
  trial_ends_at date,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (tenant_id, module_key),
  constraint tenant_modules_trial_has_end check (status <> 'trial' or trial_ends_at is not null)
);

comment on table public.tenant_modules is 'Module switch per tenant: trial / active / off (+ end of trial).';

create trigger tenant_modules_set_updated_at before update on public.tenant_modules
  for each row execute function public.set_updated_at();

create or replace function public.is_module_enabled(p_tenant_id uuid, p_module_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_modules tm
    where tm.tenant_id = p_tenant_id
      and tm.module_key = p_module_key
      and (tm.status = 'active' or (tm.status = 'trial' and tm.trial_ends_at >= current_date))
  );
$$;

revoke all on public.modules, public.tenant_modules from anon, authenticated;
grant select on public.modules to authenticated;
grant select, insert, update on public.tenant_modules to authenticated;
revoke execute on function public.is_module_enabled(uuid, text) from public, anon, authenticated;
grant execute on function public.is_module_enabled(uuid, text) to anon, authenticated;

alter table public.modules enable row level security;
alter table public.tenant_modules enable row level security;

create policy modules_select on public.modules for select to authenticated using (true);

-- Members see their tenant's switches; only the platform admin changes them (control center).
create policy tenant_modules_select on public.tenant_modules for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy tenant_modules_insert on public.tenant_modules for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy tenant_modules_update on public.tenant_modules for update to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

insert into public.modules (key) values ('services') on conflict do nothing;
