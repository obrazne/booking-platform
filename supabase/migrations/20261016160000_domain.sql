-- Domain model (ARCHITEKTURA B1): properties, units, catalogue terms, photos, seasons, rates, fees, discounts, services,
-- iCal channels, reservations (header, items, frozen price lines, payments, status history, consents, notes), occupancy.
-- Every table carries tenant_id and is protected by RLS. Translatable texts are jsonb maps {"sk": "...", "en": "..."}.
-- Public (guest) read access is limited to published properties of non-suspended tenants and never includes
-- arrival instructions, promo codes or anything about reservations.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tenant settings
-- ---------------------------------------------------------------------------

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  iban text,
  account_holder text,
  bic text,
  payment_due_hours smallint not null default 24 check (payment_due_hours between 1 and 336),
  hold_minutes smallint not null default 30 check (hold_minutes between 5 and 240),
  cancellation_policy jsonb not null default '{}'::jsonb,
  terms_url text,
  privacy_url text,
  arrival_email_days_before smallint not null default 3 check (arrival_email_days_before between 0 and 30),
  owner_notification_email text,
  vat_payer boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.tenant_settings is 'Payment details, deadlines, cancellation policy and legal links of a tenant (B8).';

-- ---------------------------------------------------------------------------
-- Catalogue terms (type, amenity, region, suitable for). tenant_id null = platform-wide term.
-- ---------------------------------------------------------------------------

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('property_type', 'amenity', 'region', 'suitable_for')),
  key text not null check (key ~ '^[a-z0-9][a-z0-9_-]*$'),
  name jsonb not null,
  icon text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index terms_platform_key_idx on public.terms (kind, key) where tenant_id is null;
create unique index terms_tenant_key_idx on public.terms (tenant_id, kind, key) where tenant_id is not null;

-- ---------------------------------------------------------------------------
-- Properties and units
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  name text not null check (length(trim(name)) > 0),
  summary jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  house_rules jsonb not null default '{}'::jsonb,
  included jsonb not null default '{}'::jsonb,
  testimonials jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  booking_mode text not null default 'whole' check (booking_mode in ('whole', 'units')),
  pricing_model text not null default 'per_night' check (pricing_model in ('per_night', 'per_person_night')),
  street text,
  city text,
  postal_code text,
  country char(2) not null default 'SK',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  max_guests smallint not null default 2 check (max_guests between 1 and 500),
  bedrooms smallint check (bedrooms >= 0),
  bathrooms smallint check (bathrooms >= 0),
  check_in_from time not null default '15:00',
  check_out_until time not null default '10:00',
  cleaning_gap_days smallint not null default 0 check (cleaning_gap_days between 0 and 7),
  pets_allowed boolean not null default false,
  tourist_tax_included boolean not null default true,
  tourist_tax_cents integer not null default 0 check (tourist_tax_cents >= 0),
  accommodation_vat_bp integer not null default 0 check (accommodation_vat_bp between 0 and 10000),
  contact_email text,
  contact_phone text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index properties_tenant_id_idx on public.properties (tenant_id);

comment on column public.properties.tourist_tax_cents is 'Tourist tax per adult and night (B3); when tourist_tax_included it is only informative.';
comment on column public.properties.cleaning_gap_days is 'Extra blocked days after each stay (B2).';

-- Non-public data of a property: arrival instructions with access codes (B6) — only for staff and the pre-arrival e-mail.
create table public.property_private (
  property_id uuid primary key references public.properties (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  arrival_instructions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.property_terms (
  property_id uuid not null references public.properties (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  primary key (property_id, term_id)
);

create index property_terms_term_id_idx on public.property_terms (term_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  description jsonb not null default '{}'::jsonb,
  max_guests smallint not null default 2 check (max_guests between 1 and 500),
  bedrooms smallint check (bedrooms >= 0),
  is_default boolean not null default false,
  active boolean not null default true,
  ical_export_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index units_property_id_idx on public.units (property_id);
create unique index units_one_default_idx on public.units (property_id) where is_default;

comment on column public.units.is_default is 'The hidden unit of a property booked as a whole (B1).';

-- Prepared for composite units (whole chalet = apartment + rest); not used by the MVP interface.
create table public.unit_components (
  parent_unit_id uuid not null references public.units (id) on delete cascade,
  child_unit_id uuid not null references public.units (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  primary key (parent_unit_id, child_unit_id),
  check (parent_unit_id <> child_unit_id)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  storage_path text not null unique,
  alt jsonb not null default '{}'::jsonb,
  width integer,
  height integer,
  sort integer not null default 0,
  source text,
  created_at timestamptz not null default now()
);

create index photos_property_id_idx on public.photos (property_id, sort);

comment on column public.photos.source is 'Origin and licence of the image (showroom stock photos).';

-- Prepared: age bands for per-person pricing and tourist tax exemptions.
create table public.age_bands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name jsonb not null,
  min_age smallint not null check (min_age >= 0),
  max_age smallint check (max_age is null or max_age >= min_age),
  tourist_tax_exempt boolean not null default false,
  sort integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Seasons and rates
-- ---------------------------------------------------------------------------

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name jsonb not null,
  color text check (color is null or color ~* '^#[0-9a-f]{6}$'),
  priority integer not null default 0,
  is_default boolean not null default false,
  min_nights smallint not null default 1 check (min_nights between 1 and 365),
  max_nights smallint check (max_nights is null or max_nights >= min_nights),
  arrival_days smallint[] check (arrival_days is null or arrival_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index seasons_property_id_idx on public.seasons (property_id);
create unique index seasons_one_default_idx on public.seasons (property_id) where is_default;

comment on column public.seasons.is_default is 'Applies to nights not covered by any other season ("celoročne").';
comment on column public.seasons.arrival_days is 'Allowed ISO weekdays of arrival (1 = Monday); null = any day.';

create table public.season_ranges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  repeat_yearly boolean not null default true,
  check (repeat_yearly or end_date >= start_date)
);

create index season_ranges_season_id_idx on public.season_ranges (season_id);

comment on table public.season_ranges is 'Inclusive night ranges of a season. With repeat_yearly only month and day matter; a range may wrap over New Year.';

create table public.rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  unique (unit_id, season_id)
);

comment on column public.rates.amount_cents is 'Price per night (per_night model) or per adult and night (per_person_night).';

-- Prepared: per-person prices by age band.
create table public.rate_band_prices (
  rate_id uuid not null references public.rates (id) on delete cascade,
  age_band_id uuid not null references public.age_bands (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  primary key (rate_id, age_band_id)
);

-- ---------------------------------------------------------------------------
-- Fees, discounts, services
-- ---------------------------------------------------------------------------

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  key text,
  name jsonb not null,
  kind text not null default 'optional' check (kind in ('automatic', 'optional', 'pet')),
  price_model text not null check (price_model in ('per_stay', 'per_night', 'per_person', 'per_person_night', 'per_item')),
  amount_cents integer not null check (amount_cents >= 0),
  refundable_deposit boolean not null default false,
  vat_bp integer not null default 0 check (vat_bp between 0 and 10000),
  active boolean not null default true,
  sort integer not null default 0
);

create index fees_property_id_idx on public.fees (property_id);

comment on column public.fees.kind is 'automatic = always added; optional = chosen by guest; pet = added per pet.';
comment on column public.fees.refundable_deposit is 'Refundable deposit — not revenue, shown separately.';

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  kind text not null check (kind in ('length_of_stay', 'promo')),
  name jsonb not null,
  code text,
  percent_bp integer check (percent_bp between 1 and 10000),
  amount_cents integer check (amount_cents > 0),
  min_nights smallint check (min_nights >= 1),
  min_guests smallint,
  max_guests smallint,
  booked_from date,
  booked_until date,
  stay_from date,
  stay_until date,
  excluded_from date,
  excluded_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((percent_bp is null) <> (amount_cents is null)),
  check (kind <> 'promo' or code is not null),
  check (kind <> 'length_of_stay' or min_nights is not null)
);

create unique index discounts_code_idx on public.discounts (tenant_id, upper(code)) where code is not null;
create index discounts_property_id_idx on public.discounts (property_id);

comment on table public.discounts is 'Discounts on accommodation. Not stacked: the best applicable one wins (B3).';

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  key text,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_model text not null check (price_model in ('per_stay', 'per_night', 'per_person', 'per_person_night', 'per_item')),
  amount_cents integer not null check (amount_cents >= 0),
  max_quantity smallint check (max_quantity >= 1),
  vat_bp integer not null default 0 check (vat_bp between 0 and 10000),
  active boolean not null default true,
  sort integer not null default 0
);

create index services_tenant_id_idx on public.services (tenant_id, property_id);

comment on table public.services is 'Additional services (module services, B4). property_id null = all properties of the tenant.';

-- ---------------------------------------------------------------------------
-- iCal channels
-- ---------------------------------------------------------------------------

create table public.ical_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  name text not null,
  source text not null default 'other' check (source in ('booking', 'airbnb', 'other')),
  import_url text not null check (import_url ~ '^https?://'),
  active boolean not null default true,
  last_sync_at timestamptz,
  last_status text check (last_status in ('ok', 'error', 'conflict')),
  last_error text,
  created_at timestamptz not null default now()
);

create index ical_channels_unit_id_idx on public.ical_channels (unit_id);

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------

create table public.reservation_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  year smallint not null,
  last_value integer not null default 0,
  primary key (tenant_id, year)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id),
  number text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  source text not null default 'direct' check (source in ('direct', 'manual', 'booking', 'airbnb', 'other')),
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_country char(2),
  adults smallint not null default 1 check (adults >= 1),
  children smallint not null default 0 check (children >= 0),
  infants smallint not null default 0 check (infants >= 0),
  pets smallint not null default 0 check (pets >= 0),
  guests_by_band jsonb,
  locale text not null default 'sk',
  currency char(3) not null,
  total_cents integer not null check (total_cents >= 0),
  payment_due_at timestamptz,
  guest_note text,
  promo_code text,
  access_token_hash text not null unique,
  cancellation_requested_at timestamptz,
  cancellation_request_note text,
  cancelled_reason text,
  marketing_consent boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create index reservations_tenant_status_idx on public.reservations (tenant_id, status, created_at desc);
create index reservations_property_id_idx on public.reservations (property_id);

comment on column public.reservations.number is 'Per-tenant number, e.g. 2026-0001; also the variable symbol without the dash.';
comment on column public.reservations.access_token_hash is 'sha256 of the guest access token (link without account, B1).';

create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  unit_id uuid not null references public.units (id),
  check_in date not null,
  check_out date not null,
  check (check_out > check_in)
);

create index reservation_items_reservation_id_idx on public.reservation_items (reservation_id);
create index reservation_items_unit_dates_idx on public.reservation_items (unit_id, check_in);

create table public.reservation_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  sort smallint not null,
  kind text not null check (kind in ('accommodation', 'fee', 'service', 'discount', 'tax', 'deposit')),
  ref_id uuid,
  label text not null,
  quantity integer not null default 1,
  unit_amount_cents integer not null,
  amount_cents integer not null,
  vat_bp integer not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index reservation_lines_reservation_id_idx on public.reservation_lines (reservation_id, sort);

comment on table public.reservation_lines is 'Frozen price breakdown (A5 order). Never recalculated after creation.';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  provider text not null default 'bank_transfer' check (provider in ('bank_transfer', 'card', 'on_site')),
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null,
  variable_symbol text,
  status text not null default 'pending' check (status in ('pending', 'received', 'refunded', 'failed', 'cancelled')),
  received_at timestamptz,
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_reservation_id_idx on public.payments (reservation_id);

create table public.reservation_status_history (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

create index reservation_status_history_reservation_idx on public.reservation_status_history (reservation_id, changed_at);

create table public.reservation_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  kind text not null check (kind in ('terms', 'cancellation', 'privacy', 'marketing')),
  version text,
  text_snapshot text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create index reservation_consents_reservation_idx on public.reservation_consents (reservation_id);

create table public.reservation_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index reservation_notes_reservation_idx on public.reservation_notes (reservation_id, created_at);

-- ---------------------------------------------------------------------------
-- Occupancy: everything that blocks a unit, with a database guarantee against overlaps (B2)
-- ---------------------------------------------------------------------------

create table public.occupancy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  nights daterange not null check (not isempty(nights) and lower_inc(nights) and not upper_inc(nights)),
  kind text not null check (kind in ('reservation', 'hold', 'block', 'ical')),
  reservation_id uuid references public.reservations (id) on delete cascade,
  ical_channel_id uuid references public.ical_channels (id) on delete cascade,
  ical_uid text,
  label text,
  is_blocking boolean not null default true,
  conflict boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind <> 'reservation' or reservation_id is not null),
  check (kind <> 'ical' or ical_channel_id is not null),
  check (kind <> 'hold' or expires_at is not null),
  check (not (is_blocking and conflict)),
  constraint occupancy_no_overlap exclude using gist (unit_id with =, nights with &&) where (is_blocking)
);

create index occupancy_unit_nights_idx on public.occupancy using gist (unit_id, nights);
create index occupancy_reservation_id_idx on public.occupancy (reservation_id);
create unique index occupancy_ical_uid_idx on public.occupancy (ical_channel_id, ical_uid) where ical_uid is not null;

comment on table public.occupancy is
  'One row per blocking interval of a unit: reservation, temporary hold, owner block, iCal event. Nights are [check_in, check_out + cleaning gap).';
comment on column public.occupancy.conflict is 'iCal event that collides with an existing blocking row; kept non-blocking and reported (A16).';
comment on column public.occupancy.label is 'Short internal label of an owner block (e.g. maintenance). Never guest data (ROZHODNUTIA 16. 10.).';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger tenant_settings_set_updated_at before update on public.tenant_settings
  for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger property_private_set_updated_at before update on public.property_private
  for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Property is visible to guests: published and its tenant is not suspended.
create or replace function public.is_public_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p join public.tenants t on t.id = p.tenant_id
    where p.id = p_property_id and p.status = 'published' and t.status <> 'suspended'
  );
$$;

-- Staff roles that may work with reservations and the calendar.
create or replace function public.is_tenant_staff(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_tenant_member(p_tenant_id, array['owner', 'reception']) or public.is_platform_admin();
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_tenant_member(p_tenant_id, array['owner']) or public.is_platform_admin();
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'tenant_settings', 'terms', 'properties', 'property_private', 'property_terms', 'units', 'unit_components',
    'photos', 'age_bands', 'seasons', 'season_ranges', 'rates', 'rate_band_prices', 'fees', 'discounts',
    'services', 'ical_channels', 'reservation_counters', 'reservations', 'reservation_items',
    'reservation_lines', 'payments', 'reservation_status_history', 'reservation_consents', 'reservation_notes',
    'occupancy'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Catalogue data: guests read published, staff read all of their tenant, owners write.
grant select on public.terms, public.properties, public.property_terms, public.units, public.photos, public.age_bands,
  public.seasons, public.season_ranges, public.rates, public.rate_band_prices, public.fees, public.discounts,
  public.services to anon;
grant select, insert, update, delete on public.terms, public.properties, public.property_private, public.property_terms,
  public.units, public.unit_components, public.photos, public.age_bands, public.seasons, public.season_ranges,
  public.rates, public.rate_band_prices, public.fees, public.discounts, public.services, public.ical_channels
  to authenticated;
grant select, insert, update on public.tenant_settings to authenticated;
-- Reservations: read by staff; all changes go through functions (status history), except notes and owner blocks.
grant select on public.reservations, public.reservation_items, public.reservation_lines, public.payments,
  public.reservation_status_history, public.reservation_consents to authenticated;
grant select, insert, delete on public.reservation_notes to authenticated;
grant select, insert, update, delete on public.occupancy to authenticated;

revoke execute on function public.is_public_property(uuid), public.is_tenant_staff(uuid), public.is_tenant_owner(uuid)
  from public, anon, authenticated;
grant execute on function public.is_public_property(uuid) to anon, authenticated;
-- Public policies call these too; for anonymous callers they simply return nothing / false.
grant execute on function public.my_tenant_ids(), public.is_platform_admin() to anon;
grant execute on function public.is_tenant_staff(uuid), public.is_tenant_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- tenant_settings: staff read, owners write.
create policy tenant_settings_select on public.tenant_settings for select to authenticated
  using (public.is_tenant_staff(tenant_id));
create policy tenant_settings_insert on public.tenant_settings for insert to authenticated
  with check (public.is_tenant_owner(tenant_id));
create policy tenant_settings_update on public.tenant_settings for update to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- terms: platform terms readable by everyone; tenant terms by members (and guests through properties).
create policy terms_select_public on public.terms for select to anon, authenticated
  using (tenant_id is null or exists (select 1 from public.tenants t where t.id = terms.tenant_id and t.status <> 'suspended'));
create policy terms_write on public.terms for all to authenticated
  using ((tenant_id is null and (select public.is_platform_admin())) or (tenant_id is not null and public.is_tenant_owner(tenant_id)))
  with check ((tenant_id is null and (select public.is_platform_admin())) or (tenant_id is not null and public.is_tenant_owner(tenant_id)));

-- properties
create policy properties_select on public.properties for select to anon, authenticated
  using (public.is_public_property(id) or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin()));
create policy properties_write on public.properties for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- property_private: staff only (reception needs arrival instructions too).
create policy property_private_select on public.property_private for select to authenticated
  using (public.is_tenant_staff(tenant_id));
create policy property_private_write on public.property_private for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- Child catalogue tables follow their property.
do $$
declare
  t text;
begin
  foreach t in array array['property_terms', 'units', 'photos', 'age_bands', 'seasons', 'fees'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select to anon, authenticated
        using (public.is_public_property(property_id) or (tenant_id in (select public.my_tenant_ids()))
               or (select public.is_platform_admin()))$f$, t);
    execute format($f$
      create policy %1$s_write on public.%1$I for all to authenticated
        using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id))$f$, t);
  end loop;
end;
$$;

create policy unit_components_select on public.unit_components for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or (select public.is_platform_admin()));
create policy unit_components_write on public.unit_components for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create policy season_ranges_select on public.season_ranges for select to anon, authenticated
  using (
    exists (select 1 from public.seasons s where s.id = season_ranges.season_id and public.is_public_property(s.property_id))
    or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin())
  );
create policy season_ranges_write on public.season_ranges for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create policy rates_select on public.rates for select to anon, authenticated
  using (
    exists (select 1 from public.units u where u.id = rates.unit_id and public.is_public_property(u.property_id))
    or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin())
  );
create policy rates_write on public.rates for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create policy rate_band_prices_select on public.rate_band_prices for select to anon, authenticated
  using (
    exists (select 1 from public.rates r join public.units u on u.id = r.unit_id
            where r.id = rate_band_prices.rate_id and public.is_public_property(u.property_id))
    or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin())
  );
create policy rate_band_prices_write on public.rate_band_prices for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- discounts: guests see only automatic (length of stay) discounts; promo codes stay secret.
create policy discounts_select on public.discounts for select to anon, authenticated
  using (
    (kind = 'length_of_stay' and active
      and (property_id is null or public.is_public_property(property_id)))
    or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin())
  );
create policy discounts_write on public.discounts for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- services (module): guests see active services of public properties (or tenant-wide ones of a public tenant).
create policy services_select on public.services for select to anon, authenticated
  using (
    (active and public.is_module_enabled(tenant_id, 'services') and (
      (property_id is not null and public.is_public_property(property_id))
      or (property_id is null and exists (select 1 from public.properties p where p.tenant_id = services.tenant_id
                                          and public.is_public_property(p.id)))))
    or (tenant_id in (select public.my_tenant_ids())) or (select public.is_platform_admin())
  );
create policy services_write on public.services for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create policy ical_channels_select on public.ical_channels for select to authenticated
  using (public.is_tenant_staff(tenant_id));
create policy ical_channels_write on public.ical_channels for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- Reservations and their parts: staff of the tenant (owner, reception) and the platform admin. Cleaning sees nothing.
do $$
declare
  t text;
begin
  foreach t in array array['reservations', 'reservation_items', 'reservation_lines', 'payments',
                           'reservation_status_history', 'reservation_consents', 'reservation_notes'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select to authenticated
        using (public.is_tenant_staff(tenant_id))$f$, t);
  end loop;
end;
$$;

create policy reservation_notes_insert on public.reservation_notes for insert to authenticated
  with check (public.is_tenant_staff(tenant_id) and author_id = (select auth.uid()));
create policy reservation_notes_delete on public.reservation_notes for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_tenant_owner(tenant_id));

-- occupancy: staff read; staff create and remove only owner blocks (reservations, holds and iCal go through functions).
create policy occupancy_select on public.occupancy for select to authenticated
  using (public.is_tenant_staff(tenant_id));
create policy occupancy_insert_block on public.occupancy for insert to authenticated
  with check (public.is_tenant_staff(tenant_id) and kind = 'block' and reservation_id is null and ical_channel_id is null);
create policy occupancy_update_block on public.occupancy for update to authenticated
  using (public.is_tenant_staff(tenant_id) and kind = 'block')
  with check (public.is_tenant_staff(tenant_id) and kind = 'block' and reservation_id is null and ical_channel_id is null);
create policy occupancy_delete_block on public.occupancy for delete to authenticated
  using (public.is_tenant_staff(tenant_id) and kind = 'block');

-- Consistency: child rows must belong to the same tenant as their parent.
create or replace function public.assert_same_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_tenant uuid;
begin
  execute format('select tenant_id from public.%I where id = $1', tg_argv[0])
    into v_parent_tenant using (to_jsonb(new) ->> tg_argv[1])::uuid;
  if v_parent_tenant is distinct from new.tenant_id then
    raise exception 'tenant mismatch on %', tg_table_name using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.assert_same_tenant() from public, anon, authenticated;

create trigger units_same_tenant before insert or update on public.units
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger photos_same_tenant before insert or update on public.photos
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger seasons_same_tenant before insert or update on public.seasons
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger season_ranges_same_tenant before insert or update on public.season_ranges
  for each row execute function public.assert_same_tenant('seasons', 'season_id');
create trigger rates_same_tenant before insert or update on public.rates
  for each row execute function public.assert_same_tenant('units', 'unit_id');
create trigger fees_same_tenant before insert or update on public.fees
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger property_private_same_tenant before insert or update on public.property_private
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger property_terms_same_tenant before insert or update on public.property_terms
  for each row execute function public.assert_same_tenant('properties', 'property_id');
create trigger ical_channels_same_tenant before insert or update on public.ical_channels
  for each row execute function public.assert_same_tenant('units', 'unit_id');
create trigger occupancy_same_tenant before insert or update on public.occupancy
  for each row execute function public.assert_same_tenant('units', 'unit_id');
create trigger age_bands_same_tenant before insert or update on public.age_bands
  for each row execute function public.assert_same_tenant('properties', 'property_id');
