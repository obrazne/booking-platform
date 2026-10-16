-- Tenant timezone and visual theme (A6, A12). Theme is readable by guests through a narrow function.

alter table public.tenants
  add column timezone text not null default 'Europe/Bratislava';

create table public.tenant_themes (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  logo_path text,
  primary_color text not null default '#0071e3' check (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text not null default '#6e6e73' check (secondary_color ~* '^#[0-9a-f]{6}$'),
  background_color text not null default '#ffffff' check (background_color ~* '^#[0-9a-f]{6}$'),
  heading_font text not null default 'geist'
    check (heading_font in ('geist', 'inter', 'manrope', 'lora', 'playfair')),
  body_font text not null default 'geist'
    check (body_font in ('geist', 'inter', 'manrope', 'lora', 'playfair')),
  radius smallint not null default 12 check (radius between 0 and 24),
  color_mode text not null default 'system' check (color_mode in ('light', 'dark', 'system')),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_themes is 'Visual theme of a tenant: booking page, widget and e-mails (A12).';

create trigger tenant_themes_set_updated_at before update on public.tenant_themes
  for each row execute function public.set_updated_at();

-- Theme for the booking page of a tenant (anonymous guests).
create or replace function public.tenant_theme(p_tenant_id uuid)
returns setof public.tenant_themes
language sql
stable
security definer
set search_path = ''
as $$
  select th.*
  from public.tenant_themes th
  join public.tenants t on t.id = th.tenant_id
  where th.tenant_id = p_tenant_id and t.status <> 'suspended';
$$;

revoke all on public.tenant_themes from anon, authenticated;
grant select, insert, update on public.tenant_themes to authenticated;
revoke execute on function public.tenant_theme(uuid) from public, anon, authenticated;
grant execute on function public.tenant_theme(uuid) to anon, authenticated;

alter table public.tenant_themes enable row level security;

create policy tenant_themes_select on public.tenant_themes for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy tenant_themes_insert on public.tenant_themes for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()));
create policy tenant_themes_update on public.tenant_themes for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()))
  with check (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()));
