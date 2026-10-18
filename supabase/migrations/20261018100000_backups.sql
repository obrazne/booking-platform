-- Z52 (3f, A9): state of the backups in the control center. The nightly backup workflow writes its result here (time,
-- size, tables compared, files, verification) with the service key; a test restore is recorded by the platform admin.
-- Only the platform admin reads (RLS). Hourly check: no successful backup for 36 hours → bell of the platform admin.

create table public.platform_backups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('backup', 'restore_test')),
  environment text not null default 'staging' check (environment in ('staging', 'production')),
  ok boolean not null,
  started_at timestamptz,
  finished_at timestamptz not null default now(),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  tables_compared integer check (tables_compared is null or tables_compared >= 0),
  files integer check (files is null or files >= 0),
  run_url text check (run_url is null or run_url ~ '^https://'),
  note text check (note is null or length(note) <= 2000),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);

comment on table public.platform_backups is
  'Results of the backups (workflow, service key) and test restores (platform admin) — Stav systému (Z52).';

create index platform_backups_kind_finished_idx on public.platform_backups (kind, finished_at desc);

alter table public.platform_backups enable row level security;

create policy platform_backups_select on public.platform_backups for select to authenticated
  using (public.is_platform_admin());
create policy platform_backups_insert on public.platform_backups for insert to authenticated
  with check (public.is_platform_admin() and kind = 'restore_test');

grant select, insert on public.platform_backups to authenticated;

-- New kind of platform notification: backup_stale. The lists are those of the latest migration (…290000) + the new one.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale']::text[]);

-- No successful backup for 36 hours (once backups are set up at all): the platform admin is told, once a day.
create or replace function public.backups_check()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
begin
  if not exists (select 1 from public.platform_backups where kind = 'backup') then
    return;
  end if;
  select max(finished_at) into v_last from public.platform_backups where kind = 'backup' and ok;
  if v_last is null or v_last < now() - interval '36 hours' then
    perform public.notify(null, 'platform', 'backup_stale',
      jsonb_build_object('last', v_last), '/platform/status',
      'backup_stale:' || to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM-DD'));
  end if;
end;
$$;

revoke execute on function public.backups_check() from public, anon, authenticated;
grant execute on function public.backups_check() to service_role;

select cron.schedule('backups-check', '17 * * * *', $$select public.backups_check()$$);
