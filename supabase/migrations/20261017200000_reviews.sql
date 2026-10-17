-- Reviews (module `reviews`, Z34, B11): verified reviews from stays. Only the guest of a reservation that was not
-- cancelled and whose departure already happened may review it, once, within 30 days. A review is published
-- automatically after 72 hours unless the owner acts (publish sooner, reject with a reason from a fixed list).
-- The owner may reply publicly and feature a review. Publicly only published reviews, through functions without
-- personal data. Manual testimonials stay separate ("from other sources") and never count into the average.
--
-- E-mails go through the existing outbox: invitation the day after departure, one reminder 7 days later (only when the
-- guest has not reviewed yet), and a message to the guest when the review is rejected (with the reason).
-- Notifications: new review, review is published in 24 hours.

insert into public.modules (key) values ('reviews') on conflict do nothing;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  rating_cleanliness smallint check (rating_cleanliness between 1 and 5),
  rating_location smallint check (rating_location between 1 and 5),
  rating_communication smallint check (rating_communication between 1 and 5),
  rating_value smallint check (rating_value between 1 and 5),
  body text not null default '' check (length(body) <= 4000),
  -- First name and initial by default; the guest may change it.
  display_name text not null check (length(display_name) between 1 and 60),
  stay_month date not null check (extract(day from stay_month) = 1),
  locale text not null default 'sk' check (locale ~ '^[a-z]{2}$'),
  status text not null default 'submitted' check (status in ('submitted', 'published', 'rejected')),
  reject_reason text check (reject_reason in ('profanity', 'personal_data', 'unrelated', 'spam')),
  owner_reply text check (length(owner_reply) between 1 and 2000),
  owner_reply_at timestamptz,
  featured boolean not null default false,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'rejected' or reject_reason is not null),
  check (status <> 'published' or published_at is not null)
);

comment on table public.reviews is
  'Verified reviews from stays (B11): one per reservation, published after 72 h unless the owner acts.';

create index reviews_tenant_status_idx on public.reviews (tenant_id, status, submitted_at desc);
create index reviews_property_idx on public.reviews (property_id) where status = 'published';
create index reviews_guest_idx on public.reviews (guest_id);

create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger record_history after insert or update or delete on public.reviews
  for each row execute function public.record_history_capture('id');

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
-- The team moderates: state, reason, reply, featured. Content of the guest is never edited by the owner.
grant update (status, reject_reason, owner_reply, featured) on public.reviews to authenticated;

create policy reviews_select on public.reviews for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or (select public.is_platform_admin())
    or (guest_id is not null and guest_id = public.current_guest_id(tenant_id))
  );
create policy reviews_update on public.reviews for update to authenticated
  using (public.is_tenant_staff(tenant_id) and public.is_module_enabled(tenant_id, 'reviews'))
  with check (public.is_tenant_staff(tenant_id) and public.is_module_enabled(tenant_id, 'reviews'));

-- ---------------------------------------------------------------------------
-- Moderation rules (whoever changes the row — owner, cron, platform)
-- ---------------------------------------------------------------------------

create or replace function public.reviews_moderate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'submitted' then
      raise exception 'review cannot return to submitted' using errcode = '22023';
    elsif new.status = 'published' then
      new.published_at := now();
      new.rejected_at := null;
      new.reject_reason := null;
    elsif new.status = 'rejected' then
      new.rejected_at := now();
      new.published_at := null;
      new.featured := false;
    end if;
  end if;
  if new.status <> 'rejected' then
    new.reject_reason := null;
  end if;
  new.owner_reply := nullif(btrim(new.owner_reply), '');
  if new.owner_reply is distinct from old.owner_reply then
    new.owner_reply_at := case when new.owner_reply is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger reviews_moderate before update on public.reviews
  for each row execute function public.reviews_moderate();

-- ---------------------------------------------------------------------------
-- Who may review
-- ---------------------------------------------------------------------------

-- ok | not_found | module_off | portal | not_stayed | not_departed | expired | exists (internal, no user check).
create or replace function public.review_eligibility(p_reservation_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_check_out date;
  v_today date;
begin
  select r.tenant_id, r.status, r.source, t.timezone into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id
  where r.id = p_reservation_id;
  if not found then
    return 'not_found';
  end if;
  if not public.is_module_enabled(v_res.tenant_id, 'reviews') then
    return 'module_off';
  end if;
  if v_res.source in ('booking', 'airbnb') then
    return 'portal';
  end if;
  if v_res.status not in ('confirmed', 'in_progress', 'completed') then
    return 'not_stayed';
  end if;
  select max(i.check_out) into v_check_out from public.reservation_items i where i.reservation_id = p_reservation_id;
  v_today := (now() at time zone v_res.timezone)::date;
  if v_check_out is null or v_check_out > v_today then
    return 'not_departed';
  end if;
  if v_today > v_check_out + 30 then
    return 'expired';
  end if;
  if exists (select 1 from public.reviews where reservation_id = p_reservation_id) then
    return 'exists';
  end if;
  return 'ok';
end;
$$;

-- The same for the signed-in guest of the reservation (account of the guest); others get not_found.
create or replace function public.my_review_eligibility(p_reservation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.reservations r
      where r.id = p_reservation_id and r.guest_id is not null
        and r.guest_id = public.current_guest_id(r.tenant_id))
    then public.review_eligibility(p_reservation_id)
    else 'not_found' end;
$$;

-- "Jana Nováková" → "Jana N."
create or replace function public.review_display_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(p_name), '') = '' then '—'
    when array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1) = 1 then left(btrim(p_name), 60)
    else left(split_part(btrim(p_name), ' ', 1), 56) || ' '
      || upper(left((regexp_split_to_array(btrim(p_name), '\s+'))[array_length(regexp_split_to_array(btrim(p_name), '\s+'), 1)], 1))
      || '.' end;
$$;

-- Guest submits the review of their stay (account of the guest). Eligibility is checked here, not in the app.
create or replace function public.submit_review(
  p_reservation_id uuid, p_rating integer, p_ratings jsonb default '{}'::jsonb, p_body text default '',
  p_display_name text default null, p_locale text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_state text;
  v_id uuid;
begin
  select r.id, r.tenant_id, r.property_id, r.guest_id, r.guest_name, r.locale,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id) as check_in
  into v_res
  from public.reservations r where r.id = p_reservation_id;
  if not found or v_res.guest_id is null or v_res.guest_id is distinct from public.current_guest_id(v_res.tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_state := public.review_eligibility(p_reservation_id);
  if v_state <> 'ok' then
    raise exception '%', v_state using errcode = 'P0001';
  end if;
  insert into public.reviews (tenant_id, property_id, reservation_id, guest_id, rating, rating_cleanliness,
    rating_location, rating_communication, rating_value, body, display_name, stay_month, locale)
  values (v_res.tenant_id, v_res.property_id, v_res.id, v_res.guest_id, p_rating,
    (p_ratings ->> 'cleanliness')::smallint, (p_ratings ->> 'location')::smallint,
    (p_ratings ->> 'communication')::smallint, (p_ratings ->> 'value')::smallint,
    left(coalesce(btrim(p_body), ''), 4000),
    coalesce(nullif(left(btrim(p_display_name), 60), ''), public.review_display_name(v_res.guest_name)),
    date_trunc('month', v_res.check_in)::date, coalesce(p_locale, v_res.locale, 'sk'))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: published reviews and the average, without personal data
-- ---------------------------------------------------------------------------

create or replace function public.public_reviews(p_tenant_id uuid, p_property_id uuid default null, p_limit integer default 50)
returns table (
  id uuid, property_id uuid, rating smallint, rating_cleanliness smallint, rating_location smallint,
  rating_communication smallint, rating_value smallint, body text, display_name text, stay_month date, locale text,
  owner_reply text, owner_reply_at timestamptz, featured boolean, published_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.property_id, v.rating, v.rating_cleanliness, v.rating_location, v.rating_communication,
    v.rating_value, v.body, v.display_name, v.stay_month, v.locale, v.owner_reply, v.owner_reply_at, v.featured,
    v.published_at
  from public.reviews v
  where v.tenant_id = p_tenant_id and v.status = 'published'
    and (p_property_id is null or v.property_id = p_property_id)
    and public.is_module_enabled(p_tenant_id, 'reviews')
  order by v.featured desc, v.published_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- Average and counts of verified published reviews of a property or of the whole client.
create or replace function public.review_summary(p_tenant_id uuid, p_property_id uuid default null)
returns table (
  count integer, average numeric, cleanliness numeric, location numeric, communication numeric, value numeric,
  distribution jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int,
    round(avg(v.rating), 1), round(avg(v.rating_cleanliness), 1), round(avg(v.rating_location), 1),
    round(avg(v.rating_communication), 1), round(avg(v.rating_value), 1),
    jsonb_build_object(
      '5', count(*) filter (where v.rating = 5), '4', count(*) filter (where v.rating = 4),
      '3', count(*) filter (where v.rating = 3), '2', count(*) filter (where v.rating = 2),
      '1', count(*) filter (where v.rating = 1))
  from public.reviews v
  where v.tenant_id = p_tenant_id and v.status = 'published'
    and (p_property_id is null or v.property_id = p_property_id)
    and public.is_module_enabled(p_tenant_id, 'reviews');
$$;

-- ---------------------------------------------------------------------------
-- E-mails and notifications
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected'));
create unique index email_outbox_review_once_idx on public.email_outbox (reservation_id, kind)
  where kind in ('guest_review_invite', 'guest_review_reminder');

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing']::text[]);

-- Facts for the notification text: who (display name), stars, property, reservation number (cleanup with it).
create or replace function public.review_notice(p_review_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('guest', v.display_name, 'rating', v.rating, 'property', p.name, 'number', r.number,
    'publishes_at', v.submitted_at + interval '72 hours')
  from public.reviews v
  join public.properties p on p.id = v.property_id
  join public.reservations r on r.id = v.reservation_id
  where v.id = p_review_id;
$$;

create or replace function public.notify_review_new()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.tenant_id, 'tenant', 'review_new', public.review_notice(new.id),
    '/admin/reviews?panel=review:' || new.id, 'review_new:' || new.id);
  return new;
end;
$$;

create trigger reviews_notify after insert on public.reviews
  for each row execute function public.notify_review_new();

-- Guest is told when the review was rejected, with the reason.
create or replace function public.enqueue_review_rejected_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload)
    values (new.tenant_id, new.reservation_id, 'guest_review_rejected',
      jsonb_build_object('reason', new.reject_reason, 'review_id', new.id));
  end if;
  return new;
end;
$$;

create trigger reviews_rejected_email after update of status on public.reviews
  for each row execute function public.enqueue_review_rejected_email();

-- Every 15 minutes: publish after 72 h, warn 24 h before, invite the day after departure (10:00 local time),
-- remind once 7 days after the invitation when the guest has not reviewed and the 30-day window is still open.
create or replace function public.reviews_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_published integer;
  v_invites integer;
  v_reminders integer;
begin
  update public.reviews set status = 'published'
  where status = 'submitted' and submitted_at <= now() - interval '72 hours';
  get diagnostics v_published = row_count;

  perform public.notify(v.tenant_id, 'tenant', 'review_publishing', public.review_notice(v.id),
    '/admin/reviews?panel=review:' || v.id, 'review_publishing:' || v.id)
  from public.reviews v
  where v.status = 'submitted' and v.submitted_at <= now() - interval '48 hours';

  insert into public.email_outbox (tenant_id, reservation_id, kind, send_after)
  select r.tenant_id, r.id, 'guest_review_invite',
    greatest(now(), ((x.check_out + 1) + time '10:00') at time zone t.timezone)
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  join lateral (select max(i.check_out) as check_out from public.reservation_items i where i.reservation_id = r.id) x
    on true
  where r.status in ('confirmed', 'in_progress', 'completed') and r.source not in ('booking', 'airbnb')
    and r.guest_email is not null
    and x.check_out between (now() at time zone t.timezone)::date - 2 and (now() at time zone t.timezone)::date - 1
    and public.is_module_enabled(r.tenant_id, 'reviews')
    and not exists (select 1 from public.reviews v where v.reservation_id = r.id)
  on conflict do nothing;
  get diagnostics v_invites = row_count;

  insert into public.email_outbox (tenant_id, reservation_id, kind)
  select o.tenant_id, o.reservation_id, 'guest_review_reminder'
  from public.email_outbox o
  where o.kind = 'guest_review_invite' and o.status = 'sent' and o.sent_at <= now() - interval '7 days'
    and public.review_eligibility(o.reservation_id) = 'ok'
  on conflict do nothing;
  get diagnostics v_reminders = row_count;

  return jsonb_build_object('published', v_published, 'invites', v_invites, 'reminders', v_reminders);
end;
$$;

select cron.schedule('reviews-tick', '*/15 * * * *', $$select public.reviews_tick()$$);

revoke execute on function public.reviews_moderate(), public.review_eligibility(uuid), public.review_notice(uuid),
  public.notify_review_new(), public.enqueue_review_rejected_email(), public.reviews_tick()
  from public, anon, authenticated;
revoke execute on function public.my_review_eligibility(uuid),
  public.submit_review(uuid, integer, jsonb, text, text, text) from public, anon;
grant execute on function public.my_review_eligibility(uuid),
  public.submit_review(uuid, integer, jsonb, text, text, text) to authenticated;
revoke execute on function public.public_reviews(uuid, uuid, integer), public.review_summary(uuid, uuid) from public;
grant execute on function public.public_reviews(uuid, uuid, integer), public.review_summary(uuid, uuid)
  to anon, authenticated;
grant execute on function public.reviews_tick() to service_role;
