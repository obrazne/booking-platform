-- Property page built from sections (B7). Section types are fixed in code (component + zod schema); here only which
-- sections a property shows, in which order, and their content (localized texts, photo references). No builder.

create table public.section_templates (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  name jsonb not null,
  -- Ordered section types; the calendar must be there (see check below).
  types text[] not null check ('calendar' = any (types)),
  -- Property type terms (terms.key) this template is the default for.
  property_types text[] not null default '{}',
  sort integer not null default 0
);

comment on table public.section_templates is 'Presets by accommodation type (B7): selection and order of sections for a new property.';

insert into public.section_templates (key, name, types, property_types, sort) values
  ('whole', '{"sk":"Celý objekt"}',
   array['gallery', 'intro', 'highlights', 'photo_band', 'calendar', 'prices', 'testimonials', 'faq', 'rules', 'cta'],
   array['chalet', 'chata', 'vila'], 0),
  ('rooms', '{"sk":"Penzión s izbami"}',
   array['gallery', 'intro', 'units', 'calendar', 'highlights', 'prices', 'location', 'testimonials', 'rules', 'contact', 'cta'],
   array['penzion'], 1),
  ('apartments', '{"sk":"Apartmány"}',
   array['gallery', 'intro', 'units', 'highlights', 'calendar', 'prices', 'about', 'location', 'rules', 'cta'],
   array['apartmany'], 2),
  ('glamping', '{"sk":"Glamping"}',
   array['gallery', 'intro', 'photo_band', 'highlights', 'calendar', 'included', 'location', 'faq', 'rules', 'cta'],
   array['glamping'], 3);

create table public.property_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z0-9_.]*$'),
  sort integer not null default 0,
  enabled boolean not null default true,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The calendar with prices is mandatory (B7): it cannot be switched off.
  check (type <> 'calendar' or enabled)
);

create index property_sections_property_idx on public.property_sections (property_id, sort);
create index property_sections_tenant_idx on public.property_sections (tenant_id);

comment on table public.property_sections is 'Sections of the property page (B7). Content is validated by the section type in code; '
  'facts the system knows (prices, min. nights, check-in, amenities, cancellation) are never stored here.';

create trigger property_sections_set_updated_at before update on public.property_sections
  for each row execute function public.set_updated_at();

-- The tenant of a section must be the tenant of its property.
create or replace function public.property_sections_check_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.properties p where p.id = new.property_id and p.tenant_id = new.tenant_id) then
    raise exception 'section tenant does not match the property' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger property_sections_check_tenant before insert or update on public.property_sections
  for each row execute function public.property_sections_check_tenant();

-- Fill the sections of a property from a template (by key, else by its property type, else by booking mode).
-- Does nothing when the property already has sections, unless p_replace.
create or replace function public.apply_section_template(p_property_id uuid, p_template text default null,
                                                         p_replace boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.properties;
  v_key text := p_template;
  v_types text[];
begin
  select * into v_prop from public.properties where id = p_property_id;
  if v_prop.id is null then
    raise exception 'property not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.property_sections where property_id = p_property_id) then
    if not p_replace then
      return null;
    end if;
    delete from public.property_sections where property_id = p_property_id;
  end if;
  if v_key is null then
    select st.key into v_key
    from public.property_terms pt
    join public.terms t on t.id = pt.term_id and t.kind = 'property_type'
    join public.section_templates st on t.key = any (st.property_types)
    where pt.property_id = p_property_id
    order by st.sort
    limit 1;
  end if;
  v_key := coalesce(v_key, case v_prop.booking_mode when 'units' then 'apartments' else 'whole' end);
  select types into v_types from public.section_templates where key = v_key;
  if v_types is null then
    raise exception 'unknown section template %', v_key using errcode = '22023';
  end if;
  insert into public.property_sections (tenant_id, property_id, type, sort)
  select v_prop.tenant_id, v_prop.id, t.type, (t.ord * 10)::int
  from unnest(v_types) with ordinality as t (type, ord);
  return v_key;
end;
$$;

create or replace function public.properties_default_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.apply_section_template(new.id);
  return new;
end;
$$;

create trigger properties_default_sections after insert on public.properties
  for each row execute function public.properties_default_sections();

-- Existing properties get sections by their type.
select public.apply_section_template(id) from public.properties;

-- ---------------------------------------------------------------------------
-- RLS: guests read sections of published properties of active tenants; members read theirs; owners write.
-- ---------------------------------------------------------------------------

alter table public.section_templates enable row level security;
alter table public.property_sections enable row level security;
revoke all on public.section_templates, public.property_sections from anon, authenticated;
grant select on public.section_templates to anon, authenticated;
grant select on public.property_sections to anon, authenticated;
grant insert, update, delete on public.property_sections to authenticated;

create policy section_templates_select on public.section_templates for select to anon, authenticated using (true);

create policy property_sections_select on public.property_sections for select to anon, authenticated
  using (public.is_public_property(property_id) or (tenant_id in (select public.my_tenant_ids()))
         or (select public.is_platform_admin()));
create policy property_sections_write on public.property_sections for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

revoke execute on function public.apply_section_template(uuid, text, boolean), public.properties_default_sections(),
  public.property_sections_check_tenant() from public, anon, authenticated;
