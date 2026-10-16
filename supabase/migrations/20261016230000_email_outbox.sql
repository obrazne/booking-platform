-- Transactional e-mails (A7, B6): the database records what must be sent (outbox), the app renders and sends it
-- through the e-mail service (Resend) with retries. Events created without the web app (payment deadline expiry,
-- reminders, pre-arrival instructions) are queued here too. A pg_cron job pings the app worker every minute.
create extension if not exists pg_net with schema extensions;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete cascade,
  kind text not null check (kind in (
    'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
    'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts smallint not null default 0,
  last_error text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  to_email text,
  created_at timestamptz not null default now()
);

create index email_outbox_queue_idx on public.email_outbox (send_after) where status = 'queued';
create index email_outbox_reservation_idx on public.email_outbox (reservation_id);
-- One-off messages per reservation are never queued twice.
create unique index email_outbox_once_idx on public.email_outbox (reservation_id, kind)
  where kind in ('guest_received', 'guest_reminder', 'guest_confirmed', 'guest_arrival', 'owner_new', 'owner_expired');

comment on table public.email_outbox is 'Queue and log of transactional e-mails. Written by triggers/functions, sent by the app worker.';

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;
grant select on public.email_outbox to authenticated;
create policy email_outbox_select on public.email_outbox for select to authenticated
  using (public.is_tenant_staff(tenant_id));

-- Access token for links in later e-mails: encrypted with a key from the Vault (only the hash serves for lookup).
alter table public.reservations add column access_token_enc text;

create or replace function public.access_token_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'access_token_key' limit 1;
$$;

create or replace function public.reservation_access_token(p_reservation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when r.access_token_enc is null or public.access_token_key() is null then null
    else extensions.pgp_sym_decrypt(decode(r.access_token_enc, 'base64'), public.access_token_key()) end
  from public.reservations r where r.id = p_reservation_id;
$$;

-- Store the encrypted token when a reservation is created (create_reservation returns the plain token once).
create or replace function public.store_access_token(p_reservation_id uuid, p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reservations
  set access_token_enc = case when public.access_token_key() is null then null
    else encode(extensions.pgp_sym_encrypt(p_token, public.access_token_key()), 'base64') end
  where id = p_reservation_id
    and access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Queue messages for status changes (B6).
create or replace function public.enqueue_status_emails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
begin
  select source into v_source from public.reservations where id = new.reservation_id;
  if v_source in ('booking', 'airbnb') then
    return new;
  end if;
  if new.from_status is null and new.to_status = 'pending_payment' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_received'),
      (new.tenant_id, new.reservation_id, 'owner_new')
    on conflict do nothing;
  elsif new.from_status is null and new.to_status = 'confirmed' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_confirmed')
    on conflict do nothing;
  elsif new.from_status = 'pending_payment' and new.to_status = 'confirmed' then
    insert into public.email_outbox (tenant_id, reservation_id, kind) values
      (new.tenant_id, new.reservation_id, 'guest_confirmed')
    on conflict do nothing;
  elsif new.to_status = 'cancelled' and new.from_status is distinct from 'cancelled' then
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload) values
      (new.tenant_id, new.reservation_id, 'guest_cancelled', jsonb_build_object('reason', new.reason));
    if new.reason = 'payment_deadline_expired' then
      insert into public.email_outbox (tenant_id, reservation_id, kind) values
        (new.tenant_id, new.reservation_id, 'owner_expired')
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger reservation_status_emails after insert on public.reservation_status_history
  for each row execute function public.enqueue_status_emails();

create or replace function public.enqueue_cancel_request_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cancellation_requested_at is null and new.cancellation_requested_at is not null then
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
    values (new.tenant_id, new.id, 'owner_cancel_request', jsonb_build_object('note', new.cancellation_request_note));
  end if;
  return new;
end;
$$;

create trigger reservation_cancel_request_email after update of cancellation_requested_at on public.reservations
  for each row execute function public.enqueue_cancel_request_email();

-- Scheduled messages: payment reminder (last 6 hours of the deadline) and pre-arrival instructions (X days before).
create or replace function public.enqueue_scheduled_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_rows integer;
begin
  insert into public.email_outbox (tenant_id, reservation_id, kind)
  select r.tenant_id, r.id, 'guest_reminder'
  from public.reservations r
  where r.status = 'pending_payment' and r.source not in ('booking', 'airbnb')
    and r.payment_due_at between now() and now() + interval '6 hours'
    and r.created_at < now() - interval '1 hour'
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  insert into public.email_outbox (tenant_id, reservation_id, kind)
  select r.tenant_id, r.id, 'guest_arrival'
  from public.reservations r
  join public.reservation_items i on i.reservation_id = r.id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  join public.tenants t on t.id = r.tenant_id
  where r.status = 'confirmed' and r.source not in ('booking', 'airbnb')
    and i.check_in <= (now() at time zone t.timezone)::date + coalesce(s.arrival_email_days_before, 3)
    and i.check_in >= (now() at time zone t.timezone)::date
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_count + v_rows;
end;
$$;

-- Worker claims a batch (no double sending with parallel runs).
create or replace function public.claim_email_jobs(p_limit integer default 20)
returns setof public.email_outbox
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox o
  set status = 'sending', attempts = o.attempts + 1
  where o.id in (
    select id from public.email_outbox
    where status = 'queued' and send_after <= now()
    order by send_after
    limit p_limit
    for update skip locked
  )
  returning o.*;
$$;

create or replace function public.finish_email_job(p_id uuid, p_ok boolean, p_provider_id text, p_error text, p_to text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox
  set status = case when p_ok then 'sent' when attempts >= 5 then 'failed' else 'queued' end,
      sent_at = case when p_ok then now() end,
      provider_id = p_provider_id,
      last_error = case when p_ok then null else left(p_error, 1000) end,
      to_email = coalesce(p_to, to_email),
      send_after = case when p_ok then send_after else now() + make_interval(mins => (2 ^ attempts)::int) end
  where id = p_id;
$$;

-- Ping of the app worker (URL and secrets from the Vault; skipped when not configured, e.g. local tests).
create or replace function public.ping_job_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url' limit 1);
  v_cron text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1);
  v_bypass text := (select decrypted_secret from vault.decrypted_secrets where name = 'vercel_bypass' limit 1);
begin
  if v_url is null or v_cron is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/api/jobs/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron,
      'x-vercel-protection-bypass', coalesce(v_bypass, '')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000);
end;
$$;

select cron.schedule('job-worker', '* * * * *', $$select public.ping_job_worker()$$);

revoke execute on function public.access_token_key(), public.reservation_access_token(uuid),
  public.store_access_token(uuid, text), public.enqueue_status_emails(), public.enqueue_cancel_request_email(),
  public.enqueue_scheduled_emails(), public.claim_email_jobs(integer),
  public.finish_email_job(uuid, boolean, text, text, text), public.ping_job_worker()
  from public, anon, authenticated;
grant execute on function public.reservation_access_token(uuid), public.store_access_token(uuid, text),
  public.enqueue_scheduled_emails(), public.claim_email_jobs(integer),
  public.finish_email_job(uuid, boolean, text, text, text) to service_role;
