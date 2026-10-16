-- Guest page v2 (Z19, B1/B7/A12): testimonials table, photo categories, highlighted amenities, location and nearby places,
-- theme defaults v2. Only additions; properties.testimonials stays (copied below).

-- ---------------------------------------------------------------------------
-- Testimonials (rozhodnutie 16. 10.): per tenant, optionally per property; featured ones go to the cart (max. 5).
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  author_name text not null check (length(trim(author_name)) between 1 and 80),
  stay_month date check (stay_month is null or extract(day from stay_month) = 1),
  source text not null default 'other' check (source in ('google', 'booking', 'airbnb', 'email', 'other')),
  source_url text check (source_url is null or source_url ~ '^https://'),
  featured boolean not null default false,
  published boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_tenant_idx on public.testimonials (tenant_id, sort);
create index testimonials_property_idx on public.testimonials (property_id);

comment on table public.testimonials is 'Guest testimonials shown on the page and in the cart (B1). Name in full only with the guest''s consent.';

create trigger testimonials_set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

-- At most 5 featured testimonials per tenant; the property must belong to the same tenant.
create or replace function public.testimonials_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.property_id is not null and not exists (
    select 1 from public.properties p where p.id = new.property_id and p.tenant_id = new.tenant_id) then
    raise exception 'property of another tenant' using errcode = '23514';
  end if;
  if new.featured and (select count(*) from public.testimonials t
                       where t.tenant_id = new.tenant_id and t.featured and t.id <> new.id) >= 5 then
    raise exception 'at most 5 featured testimonials' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger testimonials_check before insert or update on public.testimonials
  for each row execute function public.testimonials_check();

-- Existing testimonials of properties are copied (source unknown → other).
insert into public.testimonials (tenant_id, property_id, body, author_name, source, featured, sort)
select p.tenant_id, p.id, jsonb_build_object('sk', t.value ->> 'text'), t.value ->> 'author', 'other', t.ordinality <= 3,
       t.ordinality::int
from public.properties p
cross join lateral jsonb_array_elements(p.testimonials) with ordinality as t (value, ordinality)
where jsonb_typeof(p.testimonials) = 'array'
  and coalesce(t.value ->> 'text', '') <> '' and coalesce(t.value ->> 'author', '') <> '';

alter table public.testimonials enable row level security;
revoke all on public.testimonials from anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

create policy testimonials_select on public.testimonials for select to anon, authenticated
  using ((published and public.is_active_tenant(tenant_id)
          and (property_id is null or public.is_public_property(property_id)))
         or tenant_id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy testimonials_write on public.testimonials for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- Link to all reviews on the client's site (opened only from the list in the panel, B1).
alter table public.tenant_settings add column reviews_url text check (reviews_url is null or reviews_url ~ '^https://');

create or replace function public.tenant_reviews_url(p_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.reviews_url from public.tenant_settings s
  where s.tenant_id = p_tenant_id and public.is_active_tenant(p_tenant_id);
$$;

-- ---------------------------------------------------------------------------
-- Photos: category for gallery albums. Amenities: highlighted for "What awaits you" with a one-line note.
-- ---------------------------------------------------------------------------
alter table public.photos add column category text
  check (category in ('exterior', 'interior', 'bedrooms', 'wellness', 'surroundings'));

alter table public.property_terms
  add column highlighted boolean not null default false,
  add column highlight_note jsonb not null default '{}'::jsonb,
  add column highlight_sort integer not null default 0;

-- ---------------------------------------------------------------------------
-- Location: exact place or approximate area (address only after confirmation) and nearby places.
-- ---------------------------------------------------------------------------
alter table public.properties add column location_mode text not null default 'approximate'
  check (location_mode in ('exact', 'approximate'));

comment on column public.properties.location_mode is 'exact = pin and address on the page; approximate = area only, address after confirmation.';

-- Guests no longer read the street, exact coordinates and contacts of a property directly …
revoke select on public.properties from anon;
grant select (id, tenant_id, slug, name, summary, description, house_rules, included, testimonials, status, booking_mode,
              pricing_model, city, country, max_guests, bedrooms, bathrooms, check_in_from, check_out_until,
              cleaning_gap_days, pets_allowed, tourist_tax_included, tourist_tax_cents, accommodation_vat_bp, sort,
              created_at, updated_at, tagline, location_mode) on public.properties to anon;

-- … but through this: exact pin and street when the owner chose so, otherwise only a rounded area (~1 km).
create or replace function public.property_public_location(p_property_id uuid)
returns table (latitude numeric, longitude numeric, approximate boolean, street text, postal_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when p.location_mode = 'exact' then p.latitude else round(p.latitude, 2) end,
    case when p.location_mode = 'exact' then p.longitude else round(p.longitude, 2) end,
    p.location_mode <> 'exact',
    case when p.location_mode = 'exact' then p.street end,
    case when p.location_mode = 'exact' then p.postal_code end
  from public.properties p
  where p.id = p_property_id and public.is_public_property(p.id) and p.latitude is not null and p.longitude is not null;
$$;

create table public.property_places (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name jsonb not null check (jsonb_typeof(name) = 'object'),
  how jsonb not null default '{}'::jsonb,
  distance text check (distance is null or length(distance) <= 40),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index property_places_property_idx on public.property_places (property_id, sort);

comment on table public.property_places is 'Places near the property for the Surroundings section (name, how to get there, distance/time).';

alter table public.property_places enable row level security;
revoke all on public.property_places from anon, authenticated;
grant select on public.property_places to anon, authenticated;
grant insert, update, delete on public.property_places to authenticated;

create policy property_places_select on public.property_places for select to anon, authenticated
  using (public.is_public_property(property_id) or (tenant_id in (select public.my_tenant_ids()))
         or (select public.is_platform_admin()));
create policy property_places_write on public.property_places for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create trigger property_places_check_tenant before insert or update on public.property_places
  for each row execute function public.property_sections_check_tenant();

-- ---------------------------------------------------------------------------
-- Theme v2 (A12): accent + complementary colour (small labels only), radius 10.
-- ---------------------------------------------------------------------------
alter table public.tenant_themes alter column secondary_color set default '#ad5a2b';
alter table public.tenant_themes alter column radius set default 10;
comment on column public.tenant_themes.secondary_color is 'Complementary colour (v2): small labels only (kickers, names), never an action.';

-- ---------------------------------------------------------------------------
-- Section templates v2 (B7): the intro contains the gallery; new types location (map), inside (mosaic).
-- Existing pages are rebuilt in the new order, texts of sections that remain are kept.
-- ---------------------------------------------------------------------------
update public.section_templates set types = case key
  when 'whole' then array['intro', 'highlights', 'calendar', 'photo_band', 'location', 'prices', 'inside', 'testimonials',
                          'faq', 'rules', 'cta']
  when 'rooms' then array['intro', 'units', 'calendar', 'highlights', 'location', 'prices', 'inside', 'testimonials',
                          'rules', 'contact', 'cta']
  when 'apartments' then array['intro', 'units', 'highlights', 'calendar', 'prices', 'inside', 'about', 'location',
                               'rules', 'cta']
  when 'glamping' then array['intro', 'photo_band', 'highlights', 'calendar', 'location', 'included', 'inside', 'faq',
                             'rules', 'cta']
  else types end;

do $$
declare
  r record;
  v_saved jsonb;
  v_template text;
begin
  for r in select distinct property_id from public.property_sections loop
    select jsonb_object_agg(type, jsonb_build_object('content', content, 'enabled', enabled)) into v_saved
    from public.property_sections where property_id = r.property_id;
    v_template := public.apply_section_template(r.property_id, null, true);
    update public.property_sections s
    set content = coalesce(v_saved -> s.type -> 'content', s.content),
        enabled = coalesce((v_saved -> s.type ->> 'enabled')::boolean, s.enabled) or s.type = 'calendar'
    where s.property_id = r.property_id;
  end loop;
end;
$$;

revoke execute on function public.testimonials_check(), public.tenant_reviews_url(uuid),
  public.property_public_location(uuid) from public, anon, authenticated;
grant execute on function public.tenant_reviews_url(uuid), public.property_public_location(uuid) to anon, authenticated;
