-- Z67: Pomoc a hľadanie (vizuál administrácie v1.5, dosky 15–16). Only adds:
--   * help_feedback — "Pomohlo vám to? Áno / Nie" per question and person (changeable); the control center sees the
--     counts (which guides do not help);
--   * support_requests — "Nenašli ste odpoveď?": text, optional picture (private bucket support-attachments), the
--     client, the person and the page they wrote from; the platform admin is told in the bell and by e-mail;
--   * new kinds: notification support_request (platform), e-mail platform_support_request.
-- The search itself needs no table: pages and help are a register in code, records are read under RLS.

create table public.help_feedback (
  faq_id text not null check (faq_id ~ '^[A-Za-z0-9_-]{1,60}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  helpful boolean not null,
  updated_at timestamptz not null default now(),
  primary key (faq_id, user_id)
);

alter table public.help_feedback enable row level security;

create policy help_feedback_own on public.help_feedback for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (tenant_id is null or public.is_tenant_member(tenant_id) or public.is_platform_admin()));
create policy help_feedback_platform on public.help_feedback for select to authenticated
  using (public.is_platform_admin());

grant select, insert, update on public.help_feedback to authenticated;

-- Counts per question for the control center.
create or replace function public.help_feedback_stats()
returns table (faq_id text, yes integer, no integer, last_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.faq_id, count(*) filter (where f.helpful)::integer, count(*) filter (where not f.helpful)::integer,
         max(f.updated_at)
  from public.help_feedback f
  group by f.faq_id
  order by count(*) filter (where not f.helpful) desc, f.faq_id;
$$;

grant execute on function public.help_feedback_stats() to authenticated;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  user_name text,
  page text check (length(page) <= 300),
  message text not null check (length(btrim(message)) between 1 and 5000),
  attachment_path text,
  user_agent text check (length(user_agent) <= 400),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index support_requests_created_idx on public.support_requests (created_at desc);

alter table public.support_requests enable row level security;

-- Written only through support_request_create (checks); read and closed by the platform admin.
create policy support_requests_platform_select on public.support_requests for select to authenticated
  using (public.is_platform_admin());
create policy support_requests_platform_update on public.support_requests for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

grant select, update (status, done_at) on public.support_requests to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
-- No policies on storage.objects: the server uploads (service role) and gives the platform admin a signed link.

-- New kind of platform notification: support_request. The lists are those of the latest migration (…18100000) + the new one.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale', 'support_request'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new', 'backup_stale', 'support_request']::text[]);

-- New kind of e-mail: platform_support_request. The list is that of the latest migration (…19100000) + the new one.
alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer', 'guest_message', 'owner_message', 'owner_monthly_report',
  'platform_support_request'));

-- "Nenašli ste odpoveď?" — a member of the client's team (or the platform admin in the client's administration).
-- At most 10 a day per person. The bell of the platform admin and an e-mail to the support address (worker).
create or replace function public.support_request_create(
  p_tenant_id uuid, p_page text, p_message text, p_attachment_path text, p_user_agent text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
  v_email text;
  v_name text;
  v_tenant text;
begin
  if v_user is null or not (public.is_tenant_member(p_tenant_id) or public.is_platform_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.support_requests
      where user_id = v_user and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many requests' using errcode = 'P0001';
  end if;
  if p_attachment_path is not null and p_attachment_path !~ ('^' || p_tenant_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception 'bad attachment' using errcode = '22023';
  end if;
  select u.email into v_email from auth.users u where u.id = v_user;
  select p.full_name into v_name from public.profiles p where p.id = v_user;
  select t.name into v_tenant from public.tenants t where t.id = p_tenant_id;
  insert into public.support_requests (tenant_id, user_id, user_email, user_name, page, message, attachment_path, user_agent)
  values (p_tenant_id, v_user, v_email, v_name, left(p_page, 300), btrim(p_message), p_attachment_path, left(p_user_agent, 400))
  returning id into v_id;
  perform public.notify(null, 'platform', 'support_request',
    jsonb_build_object('tenant', v_tenant, 'user', coalesce(nullif(v_name, ''), v_email)),
    '/platform/support', 'support_request:' || v_id);
  insert into public.email_outbox (tenant_id, kind, payload)
  values (p_tenant_id, 'platform_support_request', jsonb_build_object('request_id', v_id));
  return v_id;
end;
$$;

revoke execute on function public.support_request_create(uuid, text, text, text, text) from public, anon;
grant execute on function public.support_request_create(uuid, text, text, text, text) to authenticated;
