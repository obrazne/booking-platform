-- Core tenancy: tenants (clients), their domains, user profiles, memberships, platform admins, audit log.
-- Every table holding client data carries tenant_id and is protected by RLS (ARCHITEKTURA A2).
-- Helper functions are SECURITY DEFINER with an empty search_path (pattern from Credit Manager).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  name text not null check (length(trim(name)) > 0),
  country char(2) not null default 'SK' check (country ~ '^[A-Z]{2}$'),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  default_locale text not null default 'sk',
  locales text[] not null default array['sk'],
  status text not null default 'active' check (status in ('onboarding', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_default_locale_in_locales check (default_locale = any (locales))
);

comment on table public.tenants is 'Client of the platform (accommodation business).';

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  hostname text not null unique check (hostname = lower(hostname) and hostname !~ '[/:\s]'),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index tenant_domains_tenant_id_idx on public.tenant_domains (tenant_id);
create unique index tenant_domains_one_primary_idx on public.tenant_domains (tenant_id) where is_primary;

comment on table public.tenant_domains is 'Hostnames (platform subdomain or custom domain) resolving to a tenant.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  locale text not null default 'sk',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Person using the admin (owner staff or platform admin). Guests are not profiles.';

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'reception', 'cleaning')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

comment on table public.memberships is 'User belongs to tenant with a role (M:N).';

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Users with access to the control center (cross-tenant).';

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_id_created_at_idx on public.audit_log (tenant_id, created_at desc);

comment on table public.audit_log is 'Who changed what and when. Append-only; written only through write_audit().';

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- Tenants of the current user (used in policies to avoid per-row function calls).
create or replace function public.my_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id from public.memberships m where m.user_id = (select auth.uid());
$$;

-- Public, minimal lookup used to resolve the tenant from the request host (also for anonymous guests).
create or replace function public.tenant_by_host(p_host text)
returns table (id uuid, slug text, name text, default_locale text, locales text[], currency char(3), country char(2))
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.slug, t.name, t.default_locale, t.locales, t.currency, t.country
  from public.tenant_domains d
  join public.tenants t on t.id = d.tenant_id
  where d.hostname = lower(split_part(p_host, ':', 1))
    and t.status <> 'suspended';
$$;

-- The only way to append to audit_log. Actor is always the calling user.
create or replace function public.write_audit(
  p_tenant_id uuid,
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not (public.is_platform_admin() or (p_tenant_id is not null and public.is_tenant_member(p_tenant_id))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
  values (p_tenant_id, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_data, '{}'::jsonb));
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- New auth user -> profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Owners may edit their tenant's details, but slug and status belong to the platform.
create or replace function public.guard_tenant_platform_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.slug is distinct from old.slug or new.status is distinct from old.status)
     and (select auth.uid()) is not null
     and not public.is_platform_admin() then
    raise exception 'only platform admins can change slug or status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tenants_guard_platform_fields before update on public.tenants
  for each row execute function public.guard_tenant_platform_fields();
create trigger tenants_set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants (explicit, independent of the project's auto-expose setting)
-- ---------------------------------------------------------------------------

revoke all on public.tenants, public.tenant_domains, public.profiles, public.memberships,
  public.platform_admins, public.audit_log from anon, authenticated;

grant select, insert, update, delete on public.tenants, public.tenant_domains, public.memberships
  to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.platform_admins, public.audit_log to authenticated;

revoke execute on function public.is_platform_admin(), public.is_tenant_member(uuid, text[]),
  public.my_tenant_ids(), public.tenant_by_host(text),
  public.write_audit(uuid, text, text, text, jsonb), public.handle_new_user(), public.set_updated_at(),
  public.guard_tenant_platform_fields()
  from public, anon, authenticated;

grant execute on function public.is_platform_admin(), public.is_tenant_member(uuid, text[]),
  public.my_tenant_ids(), public.write_audit(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.tenant_by_host(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

-- tenants: members read their tenant, owners update it, only platform admins create/delete.
create policy tenants_select on public.tenants for select to authenticated
  using (id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy tenants_update on public.tenants for update to authenticated
  using (public.is_tenant_member(id, array['owner']) or (select public.is_platform_admin()))
  with check (public.is_tenant_member(id, array['owner']) or (select public.is_platform_admin()));
create policy tenants_insert on public.tenants for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy tenants_delete on public.tenants for delete to authenticated
  using ((select public.is_platform_admin()));

-- tenant_domains: members read, only platform admins manage (DNS setup is part of onboarding).
create policy tenant_domains_select on public.tenant_domains for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy tenant_domains_write on public.tenant_domains for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- profiles: own profile, owners see profiles of their team, platform admins see all.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_platform_admin())
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and public.is_tenant_member(m.tenant_id, array['owner'])
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships: own membership always; owners see and manage their tenant's team; platform admins all.
create policy memberships_select on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tenant_member(tenant_id, array['owner'])
    or (select public.is_platform_admin())
  );
create policy memberships_insert on public.memberships for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()));
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()))
  with check (public.is_tenant_member(tenant_id, array['owner']) or (select public.is_platform_admin()));
create policy memberships_delete on public.memberships for delete to authenticated
  using (
    (public.is_tenant_member(tenant_id, array['owner']) and user_id <> (select auth.uid()))
    or (select public.is_platform_admin())
  );

-- platform_admins: readable by admins and by the user about themselves; managed only with the service role.
create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

-- audit_log: platform admins read everything, owners read their tenant. Writes only via write_audit().
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.is_platform_admin()) or public.is_tenant_member(tenant_id, array['owner']));
