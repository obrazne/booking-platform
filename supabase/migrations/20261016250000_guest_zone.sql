-- Guest zone data model (B10), no interface yet. A guest is a record of one tenant (the same e-mail at two tenants is two
-- guests — the platform never joins guest data across tenants). Optional link to a login (Supabase Auth, passwordless).

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  name text,
  phone text,
  country char(2),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email),
  unique (tenant_id, user_id)
);

comment on table public.guests is 'Guest of one tenant (B10). Linked to a login only after the e-mail was verified.';

create trigger guests_set_updated_at before update on public.guests
  for each row execute function public.set_updated_at();

alter table public.reservations add column guest_id uuid references public.guests (id) on delete set null;
create index reservations_guest_id_idx on public.reservations (guest_id);

-- Every reservation belongs to the tenant's guest record with the same e-mail (created on first booking).
create or replace function public.attach_guest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest uuid;
begin
  if new.guest_id is not null then
    return new;
  end if;
  insert into public.guests (tenant_id, email, name, phone, country, marketing_consent, marketing_consent_at)
  values (new.tenant_id, lower(new.guest_email), new.guest_name, new.guest_phone, new.guest_country,
          new.marketing_consent, case when new.marketing_consent then now() end)
  on conflict (tenant_id, email) do update
    set name = coalesce(excluded.name, public.guests.name),
        phone = coalesce(excluded.phone, public.guests.phone),
        marketing_consent = public.guests.marketing_consent or excluded.marketing_consent,
        marketing_consent_at = coalesce(public.guests.marketing_consent_at, excluded.marketing_consent_at)
  returning id into v_guest;
  new.guest_id := v_guest;
  return new;
end;
$$;

create trigger reservations_attach_guest before insert on public.reservations
  for each row execute function public.attach_guest();

-- Existing reservations get their guest too.
insert into public.guests (tenant_id, email, name, phone, country)
select distinct on (tenant_id, lower(guest_email)) tenant_id, lower(guest_email), guest_name, guest_phone, guest_country
from public.reservations
order by tenant_id, lower(guest_email), created_at desc
on conflict (tenant_id, email) do nothing;
update public.reservations r set guest_id = g.id
from public.guests g
where r.guest_id is null and g.tenant_id = r.tenant_id and g.email = lower(r.guest_email);

-- Current user as a guest of a tenant.
create or replace function public.current_guest_id(p_tenant_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id from public.guests g where g.tenant_id = p_tenant_id and g.user_id = (select auth.uid());
$$;

-- After login with a verified e-mail: link the guest record of this tenant (past bookings appear in the zone).
create or replace function public.claim_guest_account(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_verified boolean;
  v_guest uuid;
begin
  select lower(u.email), u.email_confirmed_at is not null into v_email, v_verified
  from auth.users u where u.id = (select auth.uid());
  if v_email is null or not v_verified then
    raise exception 'e-mail not verified' using errcode = '42501';
  end if;
  insert into public.guests (tenant_id, email, user_id)
  values (p_tenant_id, v_email, (select auth.uid()))
  on conflict (tenant_id, email) do update set user_id = (select auth.uid())
    where public.guests.user_id is null or public.guests.user_id = (select auth.uid())
  returning id into v_guest;
  return v_guest;
end;
$$;

-- ---------------------------------------------------------------------------
-- Documents from the owner: per property (e.g. house rules) or per reservation; private storage, signed links only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-documents', 'guest-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete cascade,
  title jsonb not null,
  storage_path text not null unique,
  visible_when text not null default 'confirmed' check (visible_when in ('always', 'confirmed')),
  created_at timestamptz not null default now(),
  check ((property_id is null) <> (reservation_id is null))
);

create index documents_property_idx on public.documents (property_id);
create index documents_reservation_idx on public.documents (reservation_id);

comment on table public.documents is 'Files for guests (B10). Path in the private bucket guest-documents: <tenant_id>/...';

-- ---------------------------------------------------------------------------
-- Access codes: visible to the guest only for a confirmed stay, X days before arrival (B10).
-- ---------------------------------------------------------------------------

create or replace function public.arrival_instructions_visible(p_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reservations r
    join public.reservation_items i on i.reservation_id = r.id
    join public.tenants t on t.id = r.tenant_id
    left join public.tenant_settings s on s.tenant_id = r.tenant_id
    where r.id = p_reservation_id
      and r.status in ('confirmed', 'in_progress')
      and (now() at time zone t.timezone)::date >= i.check_in - coalesce(s.arrival_email_days_before, 3)
      and (now() at time zone t.timezone)::date <= i.check_out
  );
$$;

-- For the signed-in guest: instructions of their own reservation, or null when not (yet) visible.
create or replace function public.guest_arrival_instructions(p_reservation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pp.arrival_instructions
  from public.reservations r
  join public.guests g on g.id = r.guest_id
  join public.property_private pp on pp.property_id = r.property_id
  where r.id = p_reservation_id
    and g.user_id = (select auth.uid())
    and public.arrival_instructions_visible(r.id);
$$;

-- ---------------------------------------------------------------------------
-- RLS: the guest sees only their own data at this tenant; staff of the tenant see their guests.
-- ---------------------------------------------------------------------------

alter table public.guests enable row level security;
alter table public.documents enable row level security;
revoke all on public.guests, public.documents from anon, authenticated;
grant select, update on public.guests to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

create policy guests_select on public.guests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_tenant_staff(tenant_id));
create policy guests_update_self on public.guests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reservations_select_guest on public.reservations for select to authenticated
  using (guest_id is not null and guest_id = public.current_guest_id(tenant_id));
create policy reservation_items_select_guest on public.reservation_items for select to authenticated
  using (exists (select 1 from public.reservations r where r.id = reservation_items.reservation_id
                 and r.guest_id = public.current_guest_id(r.tenant_id)));
create policy reservation_lines_select_guest on public.reservation_lines for select to authenticated
  using (exists (select 1 from public.reservations r where r.id = reservation_lines.reservation_id
                 and r.guest_id = public.current_guest_id(r.tenant_id)));
create policy payments_select_guest on public.payments for select to authenticated
  using (exists (select 1 from public.reservations r where r.id = payments.reservation_id
                 and r.guest_id = public.current_guest_id(r.tenant_id)));

create policy documents_select on public.documents for select to authenticated
  using (
    public.is_tenant_staff(tenant_id)
    or exists (
      select 1 from public.reservations r
      where r.guest_id = public.current_guest_id(documents.tenant_id)
        and (r.id = documents.reservation_id or r.property_id = documents.property_id)
        and (documents.visible_when = 'always' or r.status in ('confirmed', 'in_progress', 'completed'))
    )
  );
create policy documents_write on public.documents for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

-- Storage: owners manage files of their tenant; guests get signed URLs from the server after the check above.
create policy guest_documents_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'guest-documents' and public.is_tenant_owner(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'guest-documents' and public.is_tenant_owner(((storage.foldername(name))[1])::uuid));

revoke execute on function public.attach_guest(), public.current_guest_id(uuid), public.claim_guest_account(uuid),
  public.arrival_instructions_visible(uuid), public.guest_arrival_instructions(uuid) from public, anon, authenticated;
grant execute on function public.current_guest_id(uuid), public.claim_guest_account(uuid),
  public.guest_arrival_instructions(uuid) to authenticated;
grant execute on function public.arrival_instructions_visible(uuid) to authenticated, service_role;
