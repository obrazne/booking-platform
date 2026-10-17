-- Push notifications (module `push`, Z33, B11): Web Push (VAPID) from the installed administration. A channel on top of
-- the bell notifications — the same text and link. Devices are personal (each user sees only theirs); per device the
-- user picks the kinds. Client devices need the `push` module; the platform admin gets platform notifications always.
--
-- Sending: a new notification with at least one matching device is queued (push_queue) and the app is pinged through
-- pg_net (`/api/push/run`, CRON_SECRET from the Vault — the same path as the e-mail worker). The minute job worker
-- also sends what is left in the queue, so nothing is lost when a ping fails.
--
-- Devices are technical data of a person, not data of the client: no record_history trigger (like notifications).

insert into public.modules (key) values ('push') on conflict do nothing;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client whose notifications come to the device; null = platform notifications (platform admin).
  tenant_id uuid references public.tenants (id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  device text not null default '' check (length(device) <= 120),
  kinds text[] not null default '{}' check (kinds <@ array[
    'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
    'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
    'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new']::text[]),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failures integer not null default 0,
  unique nulls not distinct (user_id, tenant_id, endpoint)
);

comment on table public.push_subscriptions is
  'Web Push devices of a person (per client, or null = platform) with the kinds of notifications chosen for the device.';

create index push_subscriptions_tenant_idx on public.push_subscriptions (tenant_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
-- A client device only for a member of a client with the module on; a platform device only for the platform admin.
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and case when tenant_id is null then (select public.is_platform_admin())
      else public.is_tenant_member(tenant_id) and public.is_module_enabled(tenant_id, 'push') end
  );
create policy push_subscriptions_update on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and case when tenant_id is null then (select public.is_platform_admin())
      else public.is_tenant_member(tenant_id) and public.is_module_enabled(tenant_id, 'push') end
  );

-- Delivery state is written only by the app worker (service role).
revoke update on public.push_subscriptions from authenticated;
grant update (kinds, device, p256dh, auth) on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Queue
-- ---------------------------------------------------------------------------

create table public.push_queue (
  notification_id uuid primary key references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

comment on table public.push_queue is 'Notifications waiting for Web Push; claimed once by the app worker.';

alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon, authenticated;

-- Ping of the push endpoint (URL and secrets from the Vault; skipped when not configured, e.g. local tests).
create or replace function public.ping_push_worker()
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
    url := v_url || '/api/push/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron,
      'x-vercel-protection-bypass', coalesce(v_bypass, '')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000);
end;
$$;

-- A new notification goes to the queue only when some device could receive it (cheap check; the app decides the rest).
create or replace function public.queue_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.push_subscriptions s
    where new.kind = any (s.kinds)
      and case when new.audience = 'platform' then s.tenant_id is null else s.tenant_id = new.tenant_id end
  ) and (new.audience = 'platform' or public.is_module_enabled(new.tenant_id, 'push')) then
    insert into public.push_queue (notification_id) values (new.id) on conflict do nothing;
    perform public.ping_push_worker();
  end if;
  return new;
end;
$$;

create trigger notifications_queue_push after insert on public.notifications
  for each row execute function public.queue_push();

-- The worker takes a batch once (no double sending when the ping and the minute worker meet); old rows are dropped.
create or replace function public.claim_push_jobs(p_limit integer default 50)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_queue where created_at < now() - interval '1 day';
  return query
  update public.push_queue q set claimed_at = now()
  where q.notification_id in (
    select notification_id from public.push_queue
    where claimed_at is null
    order by created_at
    limit greatest(1, least(p_limit, 200))
    for update skip locked)
  returning q.notification_id;
end;
$$;

revoke execute on function public.ping_push_worker(), public.queue_push(), public.claim_push_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_push_jobs(integer) to service_role;
