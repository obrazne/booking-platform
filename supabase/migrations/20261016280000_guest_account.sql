-- Guest account and zone (B10, Z17): login code attempts, marketing consent history, cancellation request from the zone.

-- Login codes are sent by our e-mail system; this log limits how often (per e-mail and tenant) and failed tries.
create table public.guest_auth_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(email)),
  kind text not null check (kind in ('code_sent', 'verify_failed')),
  created_at timestamptz not null default now()
);

create index guest_auth_attempts_lookup_idx on public.guest_auth_attempts (tenant_id, email, created_at);

comment on table public.guest_auth_attempts is 'Rate limit of guest login codes (server only, no client access).';

alter table public.guest_auth_attempts enable row level security;
revoke all on public.guest_auth_attempts from anon, authenticated;

-- History of the guest's marketing consent outside a reservation (revoked with one click in the zone).
create table public.guest_consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  kind text not null default 'marketing' check (kind in ('marketing')),
  granted boolean not null,
  source text not null default 'guest_zone',
  created_at timestamptz not null default now()
);

create index guest_consent_events_guest_idx on public.guest_consent_events (guest_id, created_at);

alter table public.guest_consent_events enable row level security;
revoke all on public.guest_consent_events from anon, authenticated;
grant select on public.guest_consent_events to authenticated;

create policy guest_consent_events_select on public.guest_consent_events for select to authenticated
  using (guest_id = public.current_guest_id(tenant_id) or public.is_tenant_staff(tenant_id));

-- Consent changes only through this function (it writes the history); guests no longer update the columns directly.
revoke update (marketing_consent, marketing_consent_at) on public.guests from authenticated;

create or replace function public.guest_set_marketing(p_tenant_id uuid, p_granted boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest uuid := public.current_guest_id(p_tenant_id);
begin
  if v_guest is null then
    raise exception 'not a guest of this tenant' using errcode = '42501';
  end if;
  update public.guests
  set marketing_consent = p_granted,
      marketing_consent_at = case when p_granted then now() else marketing_consent_at end
  where id = v_guest;
  insert into public.guest_consent_events (tenant_id, guest_id, kind, granted)
  values (p_tenant_id, v_guest, 'marketing', p_granted);
  return p_granted;
end;
$$;

-- Cancellation request of a signed-in guest (same effect as through the access link).
create or replace function public.guest_request_cancellation(p_reservation_id uuid, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.reservations r
  set cancellation_requested_at = coalesce(r.cancellation_requested_at, now()),
      cancellation_request_note = left(nullif(trim(p_note), ''), 2000)
  where r.id = p_reservation_id
    and r.guest_id is not null
    and r.guest_id = public.current_guest_id(r.tenant_id)
    and r.status in ('pending_payment', 'confirmed')
  returning r.id into v_id;
  return v_id is not null;
end;
$$;

revoke execute on function public.guest_set_marketing(uuid, boolean), public.guest_request_cancellation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.guest_set_marketing(uuid, boolean), public.guest_request_cancellation(uuid, text)
  to authenticated;
