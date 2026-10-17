-- Online check-in (module `checkin`, Z36, B11): data of all persons of a stay, arrival time and consent with the house
-- rules. Rules of the country (A6) live in `checkin_rules` — required fields for citizens and foreigners, document
-- types, the deadline to report a foreigner to the police, how long sensitive fields are kept. The Slovak package:
-- book of guests (name, document, permanent address, stay; foreigners also nationality and date of birth), report of
-- a foreigner within 5 days (act 404/2011), tax for accommodation by the municipality (act 582/2004).
-- FIELDS AND PERIODS MUST BE VERIFIED BEFORE PRODUCTION (the law changes).
--
-- Sensitive fields (document number, date of birth) are read only by the role owner, through functions that write
-- every view into the audit; the rest of the team sees them masked. After the retention period they are erased
-- automatically. Persons are not in record_history (it would keep copies of the sensitive fields).

insert into public.modules (key) values ('checkin') on conflict do nothing;

-- Settings of the client: retention, tax for accommodation (municipality, rate per person and night, exemption by age).
alter table public.tenant_settings
  add column checkin_retention_days integer not null default 730 check (checkin_retention_days between 30 and 3650),
  add column city_tax_municipality text check (length(city_tax_municipality) <= 120),
  add column city_tax_cents integer not null default 0 check (city_tax_cents >= 0),
  add column city_tax_exempt_under smallint not null default 18 check (city_tax_exempt_under between 0 and 120);

-- Settings of a property: when check-in opens, e-mail reminders, instructions only after check-in.
alter table public.properties
  add column checkin_opens_days_before smallint not null default 14 check (checkin_opens_days_before between 0 and 90),
  add column checkin_reminder_days smallint[] not null default '{7,2}',
  add column checkin_required_for_instructions boolean not null default false;

-- ---------------------------------------------------------------------------
-- Rules of the country
-- ---------------------------------------------------------------------------

create or replace function public.checkin_rules(p_country text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  -- Only the Slovak package so far; another country = another branch here (and in src/modules/checkin/rules.ts).
  select jsonb_build_object(
      'country', 'SK',
      'document_types', jsonb_build_array('id_card', 'passport'),
      'required', jsonb_build_array('first_name', 'last_name', 'document_type', 'document_number', 'address'),
      'required_foreigner', jsonb_build_array('nationality', 'birth_date'),
      'foreigner_report_days', 5,
      'retention_days', 730,
      'sensitive', jsonb_build_array('document_number', 'birth_date'))
  where upper(coalesce(p_country, 'SK')) = upper(coalesce(p_country, 'SK'));
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  arrival_time text check (arrival_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  house_rules_accepted_at timestamptz,
  completed_at timestamptz,
  completed_via text check (completed_via in ('account', 'link', 'staff')),
  completed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checkins is 'Online check-in of a reservation (B11): state, arrival time, consent with the house rules.';

create table public.checkin_guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  sort smallint not null default 0,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null check (length(last_name) between 1 and 80),
  is_citizen boolean not null default true,
  nationality char(2) check (nationality ~ '^[A-Z]{2}$'),
  birth_date date check (birth_date >= date '1900-01-01'),
  document_type text check (document_type in ('id_card', 'passport')),
  document_number text check (length(document_number) between 3 and 40),
  address text check (length(address) <= 300),
  reported_at timestamptz,
  reported_by uuid references auth.users (id) on delete set null,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checkin_guests is
  'Persons of a stay (book of guests). Document number and date of birth: owner only, every view audited, erased after retention.';

create index checkin_guests_reservation_idx on public.checkin_guests (reservation_id, sort);
create index checkin_guests_unreported_idx on public.checkin_guests (tenant_id) where not is_citizen and reported_at is null;

create trigger checkins_set_updated_at before update on public.checkins
  for each row execute function public.set_updated_at();
create trigger checkin_guests_set_updated_at before update on public.checkin_guests
  for each row execute function public.set_updated_at();
create trigger record_history after insert or update or delete on public.checkins
  for each row execute function public.record_history_capture('id');

alter table public.checkins enable row level security;
alter table public.checkin_guests enable row level security;
revoke all on public.checkins, public.checkin_guests from anon, authenticated;
grant select on public.checkins, public.checkin_guests to authenticated;

create policy checkins_select on public.checkins for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or (select public.is_platform_admin())
    or exists (select 1 from public.reservations r where r.id = reservation_id
               and r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id))
  );
-- Persons directly only for the guest who wrote them; the team reads through checkin_people / reveal_checkin_guest.
create policy checkin_guests_select on public.checkin_guests for select to authenticated
  using (
    exists (select 1 from public.reservations r where r.id = reservation_id
            and r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Guest fills in (account or access link), team may too
-- ---------------------------------------------------------------------------

-- ok | module_off | not_confirmed | not_open | closed
create or replace function public.checkin_window(p_reservation_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v record;
  v_today date;
begin
  select r.tenant_id, r.status, t.timezone, p.checkin_opens_days_before,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id) as check_in,
    (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id) as check_out
  into v
  from public.reservations r join public.tenants t on t.id = r.tenant_id
  join public.properties p on p.id = r.property_id
  where r.id = p_reservation_id;
  if not found then
    return 'closed';
  end if;
  if not public.is_module_enabled(v.tenant_id, 'checkin') then
    return 'module_off';
  end if;
  if v.status not in ('confirmed', 'in_progress') then
    return 'not_confirmed';
  end if;
  v_today := (now() at time zone v.timezone)::date;
  if v_today < v.check_in - v.checkin_opens_days_before then
    return 'not_open';
  end if;
  if v_today > v.check_out then
    return 'closed';
  end if;
  return 'ok';
end;
$$;

-- Saves the persons, arrival time and consent (draft). p_data: {arrival_time, house_rules_accepted, guests: [...]}.
create or replace function public.save_checkin(p_reservation_id uuid, p_data jsonb, p_token text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
  v_checkin record;
  v_id uuid;
  v_state text;
  g jsonb;
  i integer := 0;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_state := public.checkin_window(p_reservation_id);
  if v_state <> 'ok' and not (v_via = 'staff' and v_state not in ('module_off')) then
    raise exception '%', v_state using errcode = 'P0001';
  end if;
  select id, tenant_id into v_res from public.reservations where id = p_reservation_id;
  select * into v_checkin from public.checkins where reservation_id = p_reservation_id for update;
  if found and v_checkin.status = 'completed' and v_via <> 'staff' then
    raise exception 'completed' using errcode = 'P0001';
  end if;
  insert into public.checkins (tenant_id, reservation_id, status, arrival_time, house_rules_accepted_at)
  values (v_res.tenant_id, p_reservation_id, 'in_progress', nullif(p_data ->> 'arrival_time', ''),
    case when (p_data ->> 'house_rules_accepted')::boolean then now() end)
  on conflict (reservation_id) do update set
    arrival_time = excluded.arrival_time,
    house_rules_accepted_at = case when (p_data ->> 'house_rules_accepted')::boolean
      then coalesce(public.checkins.house_rules_accepted_at, now()) end
  returning id into v_id;
  if p_data ? 'guests' then
    if jsonb_array_length(p_data -> 'guests') > 30 then
      raise exception 'too_many' using errcode = '22023';
    end if;
    delete from public.checkin_guests where reservation_id = p_reservation_id;
    for g in select * from jsonb_array_elements(p_data -> 'guests') loop
      insert into public.checkin_guests (tenant_id, reservation_id, sort, first_name, last_name, is_citizen,
        nationality, birth_date, document_type, document_number, address)
      values (v_res.tenant_id, p_reservation_id, i, btrim(g ->> 'first_name'), btrim(g ->> 'last_name'),
        coalesce((g ->> 'is_citizen')::boolean, true),
        case when coalesce((g ->> 'is_citizen')::boolean, true) then 'SK' else upper(nullif(g ->> 'nationality', '')) end,
        case when nullif(g ->> 'birth_date', '')::date > current_date then null
          else nullif(g ->> 'birth_date', '')::date end,
        nullif(g ->> 'document_type', ''),
        nullif(upper(regexp_replace(coalesce(g ->> 'document_number', ''), '\s', '', 'g')), ''),
        nullif(btrim(g ->> 'address'), ''));
      i := i + 1;
    end loop;
  end if;
  return v_id;
end;
$$;

-- Missing data by the rules of the country: [] when complete, else e.g. ["guests", "0.document_number", ...].
create or replace function public.checkin_missing(p_reservation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rules jsonb;
  v_res record;
  v_checkin record;
  v_missing jsonb := '[]'::jsonb;
  g record;
  f text;
  v_count integer;
begin
  select r.adults, r.children, r.infants, t.country into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id where r.id = p_reservation_id;
  v_rules := public.checkin_rules(v_res.country);
  select * into v_checkin from public.checkins where reservation_id = p_reservation_id;
  if v_checkin.arrival_time is null then
    v_missing := v_missing || '["arrival_time"]';
  end if;
  if v_checkin.house_rules_accepted_at is null then
    v_missing := v_missing || '["house_rules"]';
  end if;
  select count(*) into v_count from public.checkin_guests where reservation_id = p_reservation_id;
  if v_count < v_res.adults + v_res.children + v_res.infants then
    v_missing := v_missing || '["guests"]';
  end if;
  for g in select * from public.checkin_guests where reservation_id = p_reservation_id order by sort loop
    for f in select jsonb_array_elements_text(v_rules -> 'required') union all
             select jsonb_array_elements_text(v_rules -> 'required_foreigner') where not g.is_citizen loop
      if (to_jsonb(g) ->> f) is null then
        v_missing := v_missing || jsonb_build_array(g.sort || '.' || f);
      end if;
    end loop;
  end loop;
  return v_missing;
end;
$$;

-- Completes the check-in when nothing is missing; the team is notified.
create or replace function public.complete_checkin(p_reservation_id uuid, p_token text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_missing jsonb;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.checkins where reservation_id = p_reservation_id) then
    raise exception 'incomplete' using errcode = 'P0001';
  end if;
  v_missing := public.checkin_missing(p_reservation_id);
  if jsonb_array_length(v_missing) > 0 then
    raise exception 'incomplete' using errcode = 'P0001', detail = v_missing::text;
  end if;
  update public.checkins
  set status = 'completed', completed_at = now(), completed_via = v_via, completed_by = auth.uid()
  where reservation_id = p_reservation_id and status <> 'completed';
end;
$$;

-- ---------------------------------------------------------------------------
-- Team: masked list, reveal (owner, audited), report of a foreigner
-- ---------------------------------------------------------------------------

create or replace function public.checkin_people(p_reservation_id uuid)
returns table (id uuid, sort smallint, first_name text, last_name text, is_citizen boolean, nationality text,
  document_type text, document_masked text, has_birth_date boolean, address text, reported_at timestamptz,
  report_due date, purged boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_country text;
  v_check_in date;
begin
  select r.tenant_id, t.country into v_tenant, v_country
  from public.reservations r join public.tenants t on t.id = r.tenant_id where r.id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_member(v_tenant) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select min(i.check_in) into v_check_in from public.reservation_items i where i.reservation_id = p_reservation_id;
  return query
  select g.id, g.sort, g.first_name, g.last_name, g.is_citizen, g.nationality::text, g.document_type,
    case when g.document_number is null then null else repeat('•', 4) || right(g.document_number, 2) end,
    g.birth_date is not null, g.address, g.reported_at,
    case when g.is_citizen then null
      else v_check_in + (public.checkin_rules(v_country) ->> 'foreigner_report_days')::int end,
    g.purged_at is not null
  from public.checkin_guests g where g.reservation_id = p_reservation_id order by g.sort;
end;
$$;

-- The owner sees the document number and date of birth; every view is written into the audit.
create or replace function public.reveal_checkin_guest(p_guest_id uuid, p_purpose text default 'view')
returns table (document_type text, document_number text, birth_date date, nationality text, address text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
begin
  select * into v_guest from public.checkin_guests where id = p_guest_id;
  if not found or not public.is_tenant_member(v_guest.tenant_id, array['owner']) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
  values (v_guest.tenant_id, auth.uid(), 'checkin.revealed', 'checkin_guest', p_guest_id::text,
    jsonb_build_object('reservation_id', v_guest.reservation_id,
      'purpose', case when p_purpose = 'report' then 'report' else 'view' end));
  return query select v_guest.document_type, v_guest.document_number, v_guest.birth_date, v_guest.nationality::text,
    v_guest.address;
end;
$$;

create or replace function public.mark_foreigner_reported(p_guest_id uuid, p_reported boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.checkin_guests where id = p_guest_id and not is_citizen;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.checkin_guests
  set reported_at = case when p_reported then now() end, reported_by = case when p_reported then auth.uid() end
  where id = p_guest_id;
end;
$$;

-- Arrival instructions: with the module and the property setting, only after a completed check-in.
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
    join public.properties p on p.id = r.property_id
    left join public.tenant_settings s on s.tenant_id = r.tenant_id
    where r.id = p_reservation_id
      and r.status in ('confirmed', 'in_progress')
      and (now() at time zone t.timezone)::date >= i.check_in - coalesce(s.arrival_email_days_before, 3)
      and (now() at time zone t.timezone)::date <= i.check_out
      and not (
        p.checkin_required_for_instructions
        and public.is_module_enabled(r.tenant_id, 'checkin')
        and not exists (select 1 from public.checkins c where c.reservation_id = r.id and c.status = 'completed'))
  );
$$;

-- ---------------------------------------------------------------------------
-- E-mails, notifications, retention
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder'));
create unique index email_outbox_checkin_reminder_once_idx on public.email_outbox (reservation_id, kind, (payload ->> 'days'))
  where kind = 'guest_checkin_reminder';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed',
  'foreigner_unreported']::text[]);

create or replace function public.notify_checkin_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.notify(new.tenant_id, 'tenant', 'checkin_completed',
      public.reservation_notice(new.reservation_id) || jsonb_build_object('arrival_time', new.arrival_time),
      '/admin/reservations?panel=reservation:' || new.reservation_id, 'checkin_completed:' || new.reservation_id,
      case when new.completed_via = 'staff' then new.completed_by end);
  end if;
  return new;
end;
$$;

create trigger checkins_notify after update of status on public.checkins
  for each row execute function public.notify_checkin_completed();

-- Hourly: reminders before arrival (days from the property, only when not completed), unreported foreigners on the
-- 4th day, and erasing sensitive fields after the retention period of the client.
create or replace function public.checkin_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reminders integer;
  v_purged integer;
begin
  insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
  select r.tenant_id, r.id, 'guest_checkin_reminder', jsonb_build_object('days', x.check_in - x.today)
  from public.reservations r
  join public.properties p on p.id = r.property_id
  join public.tenants t on t.id = r.tenant_id
  join lateral (select min(i.check_in) as check_in, (now() at time zone t.timezone)::date as today
                from public.reservation_items i where i.reservation_id = r.id) x on true
  where r.status = 'confirmed' and r.source not in ('booking', 'airbnb')
    and (x.check_in - x.today) = any (p.checkin_reminder_days)
    and public.is_module_enabled(r.tenant_id, 'checkin')
    and not exists (select 1 from public.checkins c where c.reservation_id = r.id and c.status = 'completed')
  on conflict do nothing;
  get diagnostics v_reminders = row_count;

  perform public.notify(g.tenant_id, 'tenant', 'foreigner_unreported',
    public.reservation_notice(g.reservation_id) || jsonb_build_object('person', g.first_name || ' ' || g.last_name,
      'due', x.check_in + (public.checkin_rules(t.country) ->> 'foreigner_report_days')::int),
    '/admin/reservations?panel=reservation:' || g.reservation_id, 'foreigner_unreported:' || g.id)
  from public.checkin_guests g
  join public.tenants t on t.id = g.tenant_id
  join lateral (select min(i.check_in) as check_in from public.reservation_items i
                where i.reservation_id = g.reservation_id) x on true
  where not g.is_citizen and g.reported_at is null and g.purged_at is null
    and (now() at time zone t.timezone)::date >= x.check_in + 3
    and (now() at time zone t.timezone)::date <= x.check_in + 30;

  update public.checkin_guests g
  set document_number = null, birth_date = null, purged_at = now()
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  where g.reservation_id = r.id and g.purged_at is null
    and (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id)
      + coalesce(s.checkin_retention_days, 730) < (now() at time zone t.timezone)::date;
  get diagnostics v_purged = row_count;

  return jsonb_build_object('reminders', v_reminders, 'purged', v_purged);
end;
$$;

select cron.schedule('checkin-tick', '7 * * * *', $$select public.checkin_tick()$$);

revoke execute on function public.checkin_window(uuid), public.checkin_missing(uuid), public.notify_checkin_completed(),
  public.checkin_tick() from public, anon, authenticated;
revoke execute on function public.save_checkin(uuid, jsonb, text), public.complete_checkin(uuid, text),
  public.checkin_people(uuid), public.reveal_checkin_guest(uuid, text), public.mark_foreigner_reported(uuid, boolean)
  from public;
grant execute on function public.save_checkin(uuid, jsonb, text), public.complete_checkin(uuid, text)
  to anon, authenticated, service_role;
grant execute on function public.checkin_people(uuid), public.reveal_checkin_guest(uuid, text),
  public.mark_foreigner_reported(uuid, boolean) to authenticated;
grant execute on function public.checkin_missing(uuid), public.checkin_window(uuid), public.checkin_tick()
  to service_role;
