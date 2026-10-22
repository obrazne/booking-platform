-- Z83: widget "kalendár s cenami" on the client's own website (A17 level 2). Only adds:
--   * tenant_settings.widget_sites: the websites (origins, e.g. https://chaletstromy.sk) allowed to show /embed/* in a
--     frame — the proxy turns them into Content-Security-Policy: frame-ancestors; empty = nowhere;
--   * widget_sites_by_host(host): those origins for the domain of a request (public: an origin is not a secret);
--   * widget_stats + widget_track(): views of the widget and clicks on "Pokračovať na rezerváciu" by day (a basis
--     for the statistics; counters only, no visitor data).

alter table public.tenant_settings
  add column widget_sites text[] not null default '{}'
    check (cardinality(widget_sites) <= 20);

comment on column public.tenant_settings.widget_sites is
  'Z83: origins (scheme://host[:port]) where the booking widget may be embedded (frame-ancestors).';

create or replace function public.widget_sites_by_host(p_host text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(st.widget_sites, '{}')
  from public.tenant_domains d
  join public.tenants t on t.id = d.tenant_id
  left join public.tenant_settings st on st.tenant_id = t.id
  where d.hostname = lower(split_part(p_host, ':', 1))
    and t.status <> 'suspended'
  limit 1;
$$;

grant execute on function public.widget_sites_by_host(text) to anon, authenticated;

create table public.widget_stats (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  day date not null,
  views integer not null default 0 check (views >= 0),
  continues integer not null default 0 check (continues >= 0),
  primary key (tenant_id, property_id, day)
);

comment on table public.widget_stats is
  'Z83: views of the booking widget and clicks on "Pokračovať na rezerváciu" per property and day (counters only).';

alter table public.widget_stats enable row level security;
grant select on public.widget_stats to authenticated;

create policy widget_stats_read on public.widget_stats for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());

-- Counts one view or one click of the widget of a published property on the domain of the request.
create or replace function public.widget_track(p_host text, p_slug text, p_kind text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_property uuid;
begin
  if p_kind not in ('view', 'continue') then
    return;
  end if;
  select t.id into v_tenant
    from public.tenant_domains d join public.tenants t on t.id = d.tenant_id
    where d.hostname = lower(split_part(p_host, ':', 1)) and t.status <> 'suspended'
    limit 1;
  if v_tenant is null then
    return;
  end if;
  select p.id into v_property
    from public.properties p
    where p.tenant_id = v_tenant and p.slug = p_slug and p.status = 'published';
  if v_property is null then
    return;
  end if;
  insert into public.widget_stats as w (tenant_id, property_id, day, views, continues)
  values (v_tenant, v_property, (now() at time zone 'Europe/Bratislava')::date,
          case when p_kind = 'view' then 1 else 0 end, case when p_kind = 'continue' then 1 else 0 end)
  on conflict (tenant_id, property_id, day) do update
    set views = w.views + excluded.views, continues = w.continues + excluded.continues;
end;
$$;

grant execute on function public.widget_track(text, text, text) to anon, authenticated;
