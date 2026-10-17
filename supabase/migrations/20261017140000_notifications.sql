-- Notifications — the bell (Z27, vizuál administrácie v1.2). Created in the database from events that already happen
-- (reservations, payments, cancellation requests, iCal import, e-mail queue, module trials), so every code path is
-- covered. One event for one record = one notification (dedupe key). Reading is personal (notification_reads).
--
-- Visibility (RLS): tenant notifications only for members of that tenant (and the platform admin entering its
-- administration); platform notifications only for the platform admin. Nobody writes notifications directly.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- The client the event belongs to; also set on platform notifications about a client.
  tenant_id uuid references public.tenants (id) on delete cascade,
  audience text not null check (audience in ('tenant', 'platform')),
  kind text not null check (kind in (
    'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
    'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
    'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new')),
  data jsonb not null default '{}'::jsonb,
  -- Relative link the click opens (e.g. the reservation panel).
  target text check (target is null or target ~ '^/[^/]'),
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  check (audience = 'platform' or tenant_id is not null)
);

comment on table public.notifications is
  'Bell notifications; created only by database functions from events, deduplicated by dedupe_key.';

create index notifications_tenant_created_idx on public.notifications (tenant_id, created_at desc);
create index notifications_audience_created_idx on public.notifications (audience, created_at desc);

create table public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index notification_reads_user_idx on public.notification_reads (user_id);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
revoke all on public.notifications, public.notification_reads from anon, authenticated;
grant select on public.notifications to authenticated;
grant select, insert on public.notification_reads to authenticated;

create policy notifications_select on public.notifications for select to authenticated
  using (
    case audience
      when 'tenant' then public.is_tenant_member(tenant_id) or (select public.is_platform_admin())
      else (select public.is_platform_admin())
    end
  );

-- Own read marks only, and only for notifications the user can see.
create policy notification_reads_select on public.notification_reads for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_reads_insert on public.notification_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notifications n where n.id = notification_id)
  );

-- ---------------------------------------------------------------------------
-- Writing notifications (internal; triggers and the scheduled check)
-- ---------------------------------------------------------------------------

create or replace function public.notify(
  p_tenant_id uuid, p_audience text, p_kind text, p_data jsonb, p_target text, p_dedupe text,
  p_read_by uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (tenant_id, audience, kind, data, target, dedupe_key)
  values (p_tenant_id, p_audience, p_kind, coalesce(p_data, '{}'::jsonb), p_target, p_dedupe)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  -- Whoever caused the event does not need to be told about it (e.g. staff marking a payment).
  if v_id is not null and p_read_by is not null then
    insert into public.notification_reads (notification_id, user_id) values (v_id, p_read_by)
    on conflict do nothing;
  end if;
end;
$$;

-- Facts about a reservation for the notification text.
create or replace function public.reservation_notice(p_reservation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', r.number, 'guest', r.guest_name, 'total_cents', r.total_cents, 'currency', r.currency,
    'due_at', r.payment_due_at,
    'check_in', (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id),
    'check_out', (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id))
  from public.reservations r where r.id = p_reservation_id;
$$;

-- New reservation and cancellation (status history), not for reservations imported from portals.
create or replace function public.notify_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_target text := '/admin/reservations?panel=reservation:' || new.reservation_id;
begin
  select source into v_source from public.reservations where id = new.reservation_id;
  if v_source in ('booking', 'airbnb') then
    return new;
  end if;
  if new.from_status is null then
    perform public.notify(new.tenant_id, 'tenant', 'reservation_new', public.reservation_notice(new.reservation_id),
      v_target, 'reservation_new:' || new.reservation_id, new.changed_by);
  elsif new.to_status = 'cancelled' and new.from_status is distinct from 'cancelled' then
    perform public.notify(new.tenant_id, 'tenant', 'reservation_cancelled',
      public.reservation_notice(new.reservation_id) || jsonb_build_object('reason', new.reason),
      v_target, 'reservation_cancelled:' || new.reservation_id, new.changed_by);
  end if;
  return new;
end;
$$;

create trigger reservation_status_notify after insert on public.reservation_status_history
  for each row execute function public.notify_reservation_status();

-- Payment received: the person who marked it does not get the notification as unread.
create or replace function public.notify_payment_received()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'received' and old.status is distinct from 'received' then
    perform public.notify(new.tenant_id, 'tenant', 'payment_received', public.reservation_notice(new.reservation_id),
      '/admin/reservations?panel=reservation:' || new.reservation_id, 'payment_received:' || new.id, new.received_by);
  end if;
  return new;
end;
$$;

create trigger payments_notify after update of status on public.payments
  for each row execute function public.notify_payment_received();

-- Guest asks to cancel.
create or replace function public.notify_cancel_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cancellation_requested_at is null and new.cancellation_requested_at is not null then
    perform public.notify(new.tenant_id, 'tenant', 'cancel_request',
      public.reservation_notice(new.id) || jsonb_build_object('note', left(new.cancellation_request_note, 200)),
      '/admin/reservations?panel=reservation:' || new.id,
      'cancel_request:' || new.id || ':' || extract(epoch from new.cancellation_requested_at)::bigint);
  end if;
  return new;
end;
$$;

create trigger reservations_cancel_request_notify after update of cancellation_requested_at on public.reservations
  for each row execute function public.notify_cancel_request();

-- Stays from portals (not on the first import of a calendar) and calendar conflicts.
create or replace function public.notify_portal_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel record;
  v_data jsonb;
  v_month text := to_char(lower(new.nights), 'YYYY-MM');
begin
  if new.kind <> 'ical' or new.ical_channel_id is null then
    return new;
  end if;
  select name, source, last_sync_at into v_channel from public.ical_channels where id = new.ical_channel_id;
  v_data := jsonb_build_object('channel', v_channel.name, 'source', v_channel.source,
    'check_in', lower(new.nights), 'check_out', upper(new.nights));
  if new.conflict and (tg_op = 'INSERT' or not old.conflict) then
    perform public.notify(new.tenant_id, 'tenant', 'calendar_conflict', v_data,
      '/admin/calendar?month=' || v_month, 'calendar_conflict:' || new.id || ':' || lower(new.nights));
  elsif tg_op = 'INSERT' and new.is_blocking and v_channel.last_sync_at is not null
        and upper(new.nights) > current_date then
    perform public.notify(new.tenant_id, 'tenant', 'portal_booking', v_data,
      '/admin/calendar?month=' || v_month, 'portal_booking:' || new.id);
  end if;
  return new;
end;
$$;

create trigger occupancy_notify after insert or update of conflict on public.occupancy
  for each row execute function public.notify_portal_occupancy();

-- Failed calendar synchronisation: the owner and the platform admin, once a day per calendar.
create or replace function public.notify_sync_failed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day text := to_char(now(), 'YYYY-MM-DD');
  v_data jsonb;
begin
  if new.last_status = 'error' and old.last_status is distinct from 'error' and new.active then
    v_data := jsonb_build_object('channel', new.name, 'error', left(new.last_error, 200),
      'tenant', (select name from public.tenants where id = new.tenant_id));
    perform public.notify(new.tenant_id, 'tenant', 'sync_failed', v_data, '/admin/ical',
      'sync_failed:' || new.id || ':' || v_day);
    perform public.notify(new.tenant_id, 'platform', 'client_sync_failed', v_data,
      '/platform/tenants/' || new.tenant_id, 'client_sync_failed:' || new.id || ':' || v_day);
  end if;
  return new;
end;
$$;

create trigger ical_channels_notify after update of last_status on public.ical_channels
  for each row execute function public.notify_sync_failed();

-- E-mail that could not be sent: the platform admin, once a day per client.
create or replace function public.notify_email_failed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed' then
    perform public.notify(new.tenant_id, 'platform', 'client_emails_failed',
      jsonb_build_object('tenant', (select name from public.tenants where id = new.tenant_id), 'kind', new.kind),
      '/platform/tenants/' || new.tenant_id,
      'client_emails_failed:' || new.tenant_id || ':' || to_char(now(), 'YYYY-MM-DD'));
  end if;
  return new;
end;
$$;

create trigger email_outbox_notify after update of status on public.email_outbox
  for each row execute function public.notify_email_failed();

-- New client.
create or replace function public.notify_new_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.id, 'platform', 'client_new', jsonb_build_object('tenant', new.name),
    '/platform/tenants/' || new.id, 'client_new:' || new.id);
  return new;
end;
$$;

create trigger tenants_notify after insert on public.tenants
  for each row execute function public.notify_new_tenant();

-- Scheduled (every 15 minutes): payment deadline within 24 hours, module trial ending in 7 days and 1 day.
create or replace function public.notify_scheduled()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select id, tenant_id from public.reservations
    where status = 'pending_payment' and payment_due_at between now() and now() + interval '24 hours'
  loop
    perform public.notify(r.tenant_id, 'tenant', 'payment_due', public.reservation_notice(r.id),
      '/admin/reservations?panel=reservation:' || r.id,
      'payment_due:' || r.id || ':' || (select payment_due_at from public.reservations where id = r.id));
  end loop;

  for r in
    select tm.tenant_id, tm.module_key, tm.trial_ends_at, t.name as tenant,
           (tm.trial_ends_at - current_date) as days
    from public.tenant_modules tm join public.tenants t on t.id = tm.tenant_id
    where tm.status = 'trial' and tm.trial_ends_at - current_date in (7, 1)
  loop
    perform public.notify(r.tenant_id, 'tenant', 'trial_ending',
      jsonb_build_object('module', r.module_key, 'ends_at', r.trial_ends_at, 'days', r.days),
      '/admin', 'trial_ending:' || r.tenant_id || ':' || r.module_key || ':' || r.trial_ends_at || ':' || r.days);
    perform public.notify(r.tenant_id, 'platform', 'client_trial_ending',
      jsonb_build_object('module', r.module_key, 'ends_at', r.trial_ends_at, 'days', r.days, 'tenant', r.tenant),
      '/platform/tenants/' || r.tenant_id,
      'client_trial_ending:' || r.tenant_id || ':' || r.module_key || ':' || r.trial_ends_at || ':' || r.days);
  end loop;

  -- Older than 90 days are not shown; keep the table small.
  delete from public.notifications where created_at < now() - interval '180 days';
end;
$$;

select cron.schedule('notify-scheduled', '*/15 * * * *', $$select public.notify_scheduled()$$);

revoke execute on function public.notify(uuid, text, text, jsonb, text, text, uuid), public.reservation_notice(uuid),
  public.notify_reservation_status(), public.notify_payment_received(), public.notify_cancel_request(),
  public.notify_portal_occupancy(), public.notify_sync_failed(), public.notify_email_failed(),
  public.notify_new_tenant(), public.notify_scheduled()
  from public, anon, authenticated;
grant execute on function public.notify_scheduled() to service_role;
