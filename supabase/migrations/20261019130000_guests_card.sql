-- Z68: Hostia (vizuál administrácie v1.6, doska 17) — core, not a module. Only adds:
--   * guests: language, address (with who filled it in and when), source (booking / manual), the last consent request;
--   * guest_notes: the team's note about a guest — a table of its own, so the guest never reads it (guests_select lets
--     the guest read the own row);
--   * the team edits the contact and adds a guest by hand, never the consent: the consent is switched on only by the
--     guest (cart, Moje údaje, the confirmation link); the team may only revoke it in the guest's name (reason + who)
--     or send a request (at most once in 12 months, never after a revocation);
--   * guest_consent_requests: the request with a one-time link (only the hash of the token; the e-mail worker makes it);
--   * guest_list: the list with stays, last and next stay, the total spent, paged in the database (rule 7);
--   * an export is written into the history of changes (table_name 'guest_export').

alter table public.guests
  add column language text check (language ~ '^[a-z]{2}$'),
  add column address text check (length(address) <= 300),
  add column address_source text check (address_source in ('guest', 'owner')),
  add column address_updated_at timestamptz,
  add column source text not null default 'booking' check (source in ('booking', 'manual')),
  add column consent_requested_at timestamptz;

-- Who filled in the address and when — set by the database, not by the form.
create or replace function public.guests_address_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.address is not null
     or tg_op = 'UPDATE' and new.address is distinct from old.address then
    new.address_updated_at := now();
    new.address_source := case
      when new.user_id is not null and new.user_id = (select auth.uid()) then 'guest'
      else 'owner' end;
  end if;
  return new;
end;
$$;

create trigger guests_address_stamp before insert or update on public.guests
  for each row execute function public.guests_address_stamp();

-- The team (owner, reception, platform admin) edits the contact; the guest the own one (as before).
grant update (language, address) on public.guests to authenticated;
create policy guests_update_staff on public.guests for update to authenticated
  using (public.is_tenant_staff(tenant_id)) with check (public.is_tenant_staff(tenant_id));

-- "+ Pridať hosťa": by hand, never with a consent (the columns of the consent cannot be written).
grant insert (tenant_id, email, name, phone, country, language, address, source) on public.guests to authenticated;
create policy guests_insert_staff on public.guests for insert to authenticated
  with check (public.is_tenant_staff(tenant_id) and source = 'manual');

create table public.guest_notes (
  guest_id uuid primary key references public.guests (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  body text not null check (length(body) <= 2000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.guest_notes enable row level security;
grant select, insert, update, delete on public.guest_notes to authenticated;
create policy guest_notes_staff on public.guest_notes for all to authenticated
  using (public.is_tenant_staff(tenant_id))
  with check (public.is_tenant_staff(tenant_id)
              and tenant_id = (select g.tenant_id from public.guests g where g.id = guest_id));

create trigger record_history after insert or update or delete on public.guest_notes
  for each row execute function public.record_history_capture('guest_id');

-- Consent events: why and who (revoked by the owner in the guest's name).
alter table public.guest_consent_events
  add column reason text check (length(reason) <= 300),
  add column actor_id uuid references auth.users (id) on delete set null;

-- The owner revokes the consent in the guest's name ("hosť ma požiadal o odhlásenie").
create or replace function public.guest_consent_revoke(p_guest_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
begin
  select * into v_guest from public.guests where id = p_guest_id;
  if v_guest.id is null or not public.is_tenant_staff(v_guest.tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason required' using errcode = '22023';
  end if;
  if not v_guest.marketing_consent then
    return;
  end if;
  update public.guests set marketing_consent = false where id = p_guest_id;
  insert into public.guest_consent_events (tenant_id, guest_id, kind, granted, source, reason, actor_id)
  values (v_guest.tenant_id, p_guest_id, 'marketing', false, 'owner', left(btrim(p_reason), 300), (select auth.uid()));
end;
$$;

create table public.guest_consent_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  -- Only the hash of the one-time token (made when the e-mail is sent); valid for 30 days.
  token_hash text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  confirmed_at timestamptz
);

create index guest_consent_requests_guest_idx on public.guest_consent_requests (guest_id, created_at desc);

alter table public.guest_consent_requests enable row level security;
grant select on public.guest_consent_requests to authenticated;
create policy guest_consent_requests_staff on public.guest_consent_requests for select to authenticated
  using (public.is_tenant_staff(tenant_id));

-- Can the team ask this guest for the consent now? null = yes, otherwise why not.
create or replace function public.guest_consent_request_block(p_guest_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when g.marketing_consent then 'has_consent'
    when exists (select 1 from public.guest_consent_events e where e.guest_id = g.id and not e.granted) then 'revoked'
    when g.consent_requested_at > now() - interval '12 months' then 'recent'
    when g.email like '%@%' then null
    else 'no_email' end
  from public.guests g
  where g.id = p_guest_id;
$$;

-- "Poslať žiadosť o súhlas": the request and the e-mail (the worker makes the link). Rules here, not only in the form.
create or replace function public.guest_consent_request(p_guest_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_block text;
  v_id uuid;
begin
  select * into v_guest from public.guests where id = p_guest_id;
  if v_guest.id is null or not public.is_tenant_staff(v_guest.tenant_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_block := public.guest_consent_request_block(p_guest_id);
  if v_block is not null then
    raise exception '%', v_block using errcode = 'P0001';
  end if;
  update public.guests set consent_requested_at = now() where id = p_guest_id;
  insert into public.guest_consent_requests (tenant_id, guest_id, requested_by)
  values (v_guest.tenant_id, p_guest_id, (select auth.uid()))
  returning id into v_id;
  insert into public.email_outbox (tenant_id, kind, payload)
  values (v_guest.tenant_id, 'guest_consent_request', jsonb_build_object('request_id', v_id));
  return v_id;
end;
$$;

-- The e-mail worker stores the hash of the token it sends (service role only).
create or replace function public.guest_consent_request_token(p_request_id uuid, p_token_hash text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.guest_consent_requests set token_hash = p_token_hash
  where id = p_request_id and token_hash is null and confirmed_at is null and expires_at > now()
  returning true;
$$;

-- The page of the link: what to show (the name of the accommodation), without changing anything.
create or replace function public.guest_consent_request_info(p_token_hash text)
returns table (tenant_id uuid, tenant_name text, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.tenant_id, t.name,
    case when r.confirmed_at is not null then 'confirmed'
         when r.expires_at < now() then 'expired'
         else 'open' end
  from public.guest_consent_requests r
  join public.tenants t on t.id = r.tenant_id
  where r.token_hash = p_token_hash;
$$;

-- The guest clicks "Áno, chcem dostávať ponuky" (a button on the page, not the opening of the link — e-mail scanners
-- open links). The consent is written with the source owner_request.
create or replace function public.guest_consent_confirm(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.guest_consent_requests;
begin
  select * into v_req from public.guest_consent_requests
  where token_hash = p_token_hash and confirmed_at is null and expires_at > now()
  for update;
  if v_req.id is null then
    return false;
  end if;
  update public.guest_consent_requests set confirmed_at = now() where id = v_req.id;
  update public.guests set marketing_consent = true, marketing_consent_at = now() where id = v_req.guest_id;
  insert into public.guest_consent_events (tenant_id, guest_id, kind, granted, source)
  values (v_req.tenant_id, v_req.guest_id, 'marketing', true, 'owner_request');
  return true;
end;
$$;

-- The list of guests (rule 7: filter, search, sort and page in the database). Stays = direct reservations that were
-- not cancelled; spent = those reservations + confirmed orders of services; RLS of the tables applies (invoker).
create or replace function public.guest_list(
  p_tenant_id uuid, p_filter text default '', p_q text default '', p_sort text default 'last_stay',
  p_dir text default 'desc', p_offset integer default 0, p_limit integer default 20)
returns table (
  id uuid, name text, email text, phone text, country text, marketing_consent boolean, source text,
  stays integer, last_stay date, next_stay date, spent_cents bigint, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (
    select (now() at time zone coalesce(
      (select t.timezone from public.tenants t where t.id = p_tenant_id), 'Europe/Bratislava'))::date as d
  ),
  stays as (
    select r.guest_id, r.id, r.total_cents, min(i.check_in) as check_in
    from public.reservations r
    join public.reservation_items i on i.reservation_id = r.id
    where r.tenant_id = p_tenant_id and r.guest_id is not null
      and r.status in ('pending_payment', 'confirmed', 'in_progress', 'completed')
    group by r.guest_id, r.id, r.total_cents
  ),
  orders as (
    select r.guest_id, sum(o.amount_cents) as cents
    from public.reservation_orders o
    join public.reservations r on r.id = o.reservation_id
    where o.tenant_id = p_tenant_id and o.status in ('ordered', 'awaiting_confirmation', 'confirmed')
      and r.guest_id is not null
    group by r.guest_id
  ),
  agg as (
    select g.id, g.name, g.email, g.phone, g.country::text, g.marketing_consent, g.source,
      (select count(*)::integer from stays s where s.guest_id = g.id) as stays,
      (select max(s.check_in) from stays s, today where s.guest_id = g.id and s.check_in <= today.d) as last_stay,
      (select min(s.check_in) from stays s, today where s.guest_id = g.id and s.check_in > today.d) as next_stay,
      coalesce((select sum(s.total_cents) from stays s where s.guest_id = g.id), 0)::bigint
        + coalesce((select o.cents from orders o where o.guest_id = g.id), 0)::bigint as spent_cents
    from public.guests g
    where g.tenant_id = p_tenant_id
      and (coalesce(p_q, '') = '' or g.name ilike '%' || p_q || '%' or g.email ilike '%' || p_q || '%'
           or g.phone ilike '%' || p_q || '%')
  ),
  filtered as (
    select * from agg a
    where case coalesce(p_filter, '')
      when 'returning' then a.stays >= 2
      when 'consent' then a.marketing_consent
      when 'upcoming' then a.next_stay is not null
      else true end
  )
  select f.id, f.name, f.email, f.phone, f.country, f.marketing_consent, f.source, f.stays, f.last_stay,
         f.next_stay, f.spent_cents, count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'name' and p_dir = 'asc' then coalesce(f.name, f.email) end asc,
    case when p_sort = 'name' and p_dir = 'desc' then coalesce(f.name, f.email) end desc,
    case when p_sort = 'stays' and p_dir = 'asc' then f.stays end asc,
    case when p_sort = 'stays' and p_dir = 'desc' then f.stays end desc,
    case when p_sort = 'spent' and p_dir = 'asc' then f.spent_cents end asc,
    case when p_sort = 'spent' and p_dir = 'desc' then f.spent_cents end desc,
    case when p_sort = 'last_stay' and p_dir = 'asc' then coalesce(f.next_stay, f.last_stay) end asc nulls last,
    case when p_sort = 'last_stay' and p_dir = 'desc' then coalesce(f.next_stay, f.last_stay) end desc nulls last,
    f.email
  offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100);
$$;

-- Counts for the filter pills.
create or replace function public.guest_list_counts(p_tenant_id uuid)
returns table (all_guests integer, returning_guests integer, consent integer, upcoming integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer,
         count(*) filter (where l.stays >= 2)::integer,
         count(*) filter (where l.marketing_consent)::integer,
         count(*) filter (where l.next_stay is not null)::integer
  from public.guest_list(p_tenant_id, '', '', 'name', 'asc', 0, 100000) l;
$$;

-- Exports are written into the history of changes (who, what, how many rows).
create or replace function public.guest_export_log(p_tenant_id uuid, p_scope text, p_count integer, p_guest_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_tenant_staff(p_tenant_id) or p_scope not in ('consent', 'all', 'guest') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.record_history (tenant_id, table_name, record_id, pk, op, old_row, new_row, changed_by, source)
  values (p_tenant_id, 'guest_export', coalesce(p_guest_id::text, p_scope), jsonb_build_object('scope', p_scope),
          'insert', null, jsonb_build_object('scope', p_scope, 'count', p_count, 'guest_id', p_guest_id),
          (select auth.uid()), 'user');
end;
$$;

-- New kind of e-mail: guest_consent_request. The list is that of the latest migration (…19120000) + the new one.
alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer', 'guest_message', 'owner_message', 'owner_monthly_report',
  'platform_support_request', 'guest_consent_request'));

revoke execute on function public.guest_consent_revoke(uuid, text), public.guest_consent_request(uuid),
  public.guest_consent_request_block(uuid), public.guest_consent_request_token(uuid, text),
  public.guest_consent_request_info(text), public.guest_consent_confirm(text),
  public.guest_export_log(uuid, text, integer, uuid), public.guests_address_stamp(),
  public.guest_list(uuid, text, text, text, text, integer, integer), public.guest_list_counts(uuid) from public, anon;
grant execute on function public.guest_consent_revoke(uuid, text), public.guest_consent_request(uuid),
  public.guest_consent_request_block(uuid), public.guest_export_log(uuid, text, integer, uuid),
  public.guest_list(uuid, text, text, text, text, integer, integer), public.guest_list_counts(uuid) to authenticated;
grant execute on function public.guest_consent_request_token(uuid, text), public.guest_consent_request_info(text),
  public.guest_consent_confirm(text) to service_role;
