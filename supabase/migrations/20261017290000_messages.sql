-- Messages with the guest (module `messages`, Z45, B11 Správy, ROZHODNUTIA 17. 10.): one conversation per direct
-- reservation, automatic messages by rules of the client, quick replies of the team. Screens: Z46 (admin), Z47 (guest).
-- Access codes and Wi-Fi never go into messages (variables do not offer them) — they stay in the arrival instructions.

insert into public.modules (key) values ('messages') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Rules of automatic messages: anchor (confirmation / arrival / departure) + offset in days + time in the client's
-- time zone; text per language with variables {meno}, {príchod}, {odchod}, {podpis}, {odkaz na hodnotenie}.
create table public.message_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  key text check (key ~ '^[a-z_]{1,40}$'),
  name jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  anchor text not null check (anchor in ('confirmed', 'check_in', 'check_out')),
  offset_days smallint not null default 0 check (offset_days between -60 and 60),
  -- Null = right at the anchor (only for the confirmation: "po potvrdení").
  send_time time,
  body jsonb not null default '{}'::jsonb,
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key),
  check (send_time is not null or anchor = 'confirmed')
);

comment on table public.message_rules is
  'Automatic messages of a client (B11): when (anchor + offset days + local time) and what (text per language).';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  sender text not null check (sender in ('guest', 'staff', 'auto')),
  author_id uuid references public.profiles (id) on delete set null,
  rule_id uuid references public.message_rules (id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  -- An automatic message that reached the guest inside another e-mail (confirmation, arrival instructions, upsell offer)
  -- instead of its own e-mail (no double e-mails).
  email_via text,
  created_at timestamptz not null default now()
);

comment on table public.messages is
  'Conversation of a direct reservation (B11): guest, team or automatic message. Personal data — deleted with the reservation.';

create index messages_reservation_idx on public.messages (reservation_id, created_at);
create index messages_tenant_created_idx on public.messages (tenant_id, created_at desc);
-- Every rule at most once per reservation.
create unique index messages_rule_once_idx on public.messages (reservation_id, rule_id) where sender = 'auto' and rule_id is not null;

-- Read state of a conversation: one shared "vybavené" for the team, one for the guest.
create table public.message_threads (
  reservation_id uuid primary key references public.reservations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  team_read_at timestamptz,
  guest_read_at timestamptz
);

-- A scheduled automatic message changed or left out for one reservation.
create table public.message_overrides (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  rule_id uuid not null references public.message_rules (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  skip boolean not null default false,
  body text check (length(body) between 1 and 4000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (reservation_id, rule_id)
);

-- Saved texts of the team.
create table public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  body text not null check (length(body) between 1 and 4000),
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create trigger message_rules_set_updated_at before update on public.message_rules
  for each row execute function public.set_updated_at();
create trigger record_history after insert or update or delete on public.message_rules
  for each row execute function public.record_history_capture('id');
create trigger record_history after insert or update or delete on public.messages
  for each row execute function public.record_history_capture('id');
create trigger record_history after insert or update or delete on public.quick_replies
  for each row execute function public.record_history_capture('id');
create trigger record_history after insert or update or delete on public.message_overrides
  for each row execute function public.record_history_capture('reservation_id', 'rule_id');

alter table public.message_rules enable row level security;
alter table public.messages enable row level security;
alter table public.message_threads enable row level security;
alter table public.message_overrides enable row level security;
alter table public.quick_replies enable row level security;
revoke all on public.message_rules, public.messages, public.message_threads, public.message_overrides,
  public.quick_replies from anon, authenticated;
grant select, insert, update, delete on public.message_rules, public.message_overrides, public.quick_replies
  to authenticated;
grant select on public.messages, public.message_threads to authenticated;

create policy message_rules_select on public.message_rules for select to authenticated
  using (public.is_tenant_member(tenant_id) or (select public.is_platform_admin()));
create policy message_rules_write on public.message_rules for all to authenticated
  using (public.is_tenant_staff(tenant_id)) with check (public.is_tenant_staff(tenant_id));
create policy quick_replies_select on public.quick_replies for select to authenticated
  using (public.is_tenant_member(tenant_id) or (select public.is_platform_admin()));
create policy quick_replies_write on public.quick_replies for all to authenticated
  using (public.is_tenant_staff(tenant_id)) with check (public.is_tenant_staff(tenant_id));
create policy message_overrides_select on public.message_overrides for select to authenticated
  using (public.is_tenant_member(tenant_id) or (select public.is_platform_admin()));
create policy message_overrides_write on public.message_overrides for all to authenticated
  using (public.is_tenant_staff(tenant_id)) with check (public.is_tenant_staff(tenant_id));
-- Messages: the team, and the guest of the reservation in the account (the access link reads through messages_for).
create policy messages_select on public.messages for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or (select public.is_platform_admin())
    or exists (select 1 from public.reservations r where r.id = reservation_id
               and r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id))
  );
create policy message_threads_select on public.message_threads for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    or exists (select 1 from public.reservations r where r.id = reservation_id
               and r.guest_id is not null and r.guest_id = public.current_guest_id(r.tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Writing and reading
-- ---------------------------------------------------------------------------

-- A message from the guest (account or access link) or the team. The guest writes from the reservation until 30 days
-- after departure, at most 20 messages an hour; only direct reservations (portal stays have no guest here).
create or replace function public.send_message(p_reservation_id uuid, p_body text, p_token text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
  v_id uuid;
  v_sender text;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.id, r.tenant_id, r.source, r.status, t.timezone,
    (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id) as check_out
  into v_res
  from public.reservations r join public.tenants t on t.id = r.tenant_id where r.id = p_reservation_id;
  if not public.is_module_enabled(v_res.tenant_id, 'messages') then
    raise exception 'module_off' using errcode = 'P0001';
  end if;
  if v_res.source in ('booking', 'airbnb') then
    raise exception 'portal_reservation' using errcode = 'P0001';
  end if;
  if coalesce(length(btrim(p_body)), 0) not between 1 and 4000 then
    raise exception 'invalid_length' using errcode = '22023';
  end if;
  v_sender := case when v_via = 'staff' then 'staff' else 'guest' end;
  if v_sender = 'guest' then
    if (now() at time zone v_res.timezone)::date > v_res.check_out + 30 then
      raise exception 'closed' using errcode = 'P0001';
    end if;
    if (select count(*) from public.messages m where m.reservation_id = p_reservation_id and m.sender = 'guest'
        and m.created_at > now() - interval '1 hour') >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  insert into public.messages (tenant_id, reservation_id, sender, author_id, body)
  values (v_res.tenant_id, p_reservation_id, v_sender, case when v_sender = 'staff' then auth.uid() end, btrim(p_body))
  returning id into v_id;
  -- Who writes has read the conversation.
  insert into public.message_threads (reservation_id, tenant_id, team_read_at, guest_read_at)
  values (p_reservation_id, v_res.tenant_id, case when v_sender = 'staff' then now() end,
    case when v_sender = 'guest' then now() end)
  on conflict (reservation_id) do update set
    team_read_at = case when v_sender = 'staff' then now() else public.message_threads.team_read_at end,
    guest_read_at = case when v_sender = 'guest' then now() else public.message_threads.guest_read_at end;
  return v_id;
end;
$$;

-- Opening the conversation marks it read (the team shares one state).
create or replace function public.mark_messages_read(p_reservation_id uuid, p_token text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_tenant uuid;
begin
  if v_via is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select tenant_id into v_tenant from public.reservations where id = p_reservation_id;
  insert into public.message_threads (reservation_id, tenant_id, team_read_at, guest_read_at)
  values (p_reservation_id, v_tenant, case when v_via = 'staff' then now() end, case when v_via <> 'staff' then now() end)
  on conflict (reservation_id) do update set
    team_read_at = case when v_via = 'staff' then now() else public.message_threads.team_read_at end,
    guest_read_at = case when v_via <> 'staff' then now() else public.message_threads.guest_read_at end;
end;
$$;

-- Messages of a reservation for the access link (account and team read them through RLS).
create or replace function public.messages_for(p_reservation_id uuid, p_token text default null)
returns table (id uuid, sender text, body text, created_at timestamptz, rule_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.reservation_access(p_reservation_id, p_token) is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query select m.id, m.sender, m.body, m.created_at, m.rule_id from public.messages m
    where m.reservation_id = p_reservation_id order by m.created_at;
end;
$$;

-- Conversations waiting for the team: the last message is the guest's (the menu badge).
create or replace function public.messages_waiting(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from (
    select distinct on (m.reservation_id) m.sender
    from public.messages m
    where m.tenant_id = p_tenant_id and public.is_tenant_member(p_tenant_id)
    order by m.reservation_id, m.created_at desc
  ) last where last.sender = 'guest';
$$;

-- Inbox: one row per conversation with the last message; p_filter 'all' | 'waiting' | 'upcoming' (before arrival and
-- during the stay) | 'past' (after departure); p_search in the guest's name, e-mail and number.
create or replace function public.message_inbox(p_tenant_id uuid, p_filter text default 'all', p_search text default null)
returns table (reservation_id uuid, number text, guest_name text, check_in date, check_out date, status text,
  last_body text, last_sender text, last_at timestamptz, unread boolean, waiting boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with last as (
    select distinct on (m.reservation_id) m.reservation_id, m.body, m.sender, m.created_at
    from public.messages m where m.tenant_id = p_tenant_id
    order by m.reservation_id, m.created_at desc
  )
  select r.id, r.number, r.guest_name, x.check_in, x.check_out, r.status, l.body, l.sender, l.created_at,
    exists (select 1 from public.messages g where g.reservation_id = r.id and g.sender = 'guest'
            and g.created_at > coalesce(th.team_read_at, '-infinity')),
    l.sender = 'guest'
  from last l
  join public.reservations r on r.id = l.reservation_id
  join public.tenants t on t.id = r.tenant_id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  left join public.message_threads th on th.reservation_id = r.id
  where public.is_tenant_member(p_tenant_id)
    and (p_filter = 'all'
      or (p_filter = 'waiting' and l.sender = 'guest')
      or (p_filter = 'upcoming' and x.check_out >= (now() at time zone t.timezone)::date and r.status <> 'cancelled')
      or (p_filter = 'past' and (x.check_out < (now() at time zone t.timezone)::date or r.status = 'cancelled')))
    and (p_search is null or btrim(p_search) = ''
      or r.guest_name ilike '%' || btrim(p_search) || '%' or r.guest_email ilike '%' || btrim(p_search) || '%'
      or r.number ilike '%' || btrim(p_search) || '%')
  order by l.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Automatic messages
-- ---------------------------------------------------------------------------

-- When a rule is due for a reservation (null for a confirmation that never happened).
create or replace function public.message_rule_at(p_rule public.message_rules, p_reservation_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case p_rule.anchor
    when 'confirmed' then (
      select coalesce(
        (select min(h.changed_at) from public.reservation_status_history h
         where h.reservation_id = r.id and h.to_status = 'confirmed'),
        case when r.status in ('confirmed', 'in_progress', 'completed') then r.created_at end)
      + make_interval(days => p_rule.offset_days))
    when 'check_in' then
      ((x.check_in + p_rule.offset_days)::timestamp + p_rule.send_time) at time zone t.timezone
    else
      ((x.check_out + p_rule.offset_days)::timestamp + p_rule.send_time) at time zone t.timezone
    end
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  where r.id = p_reservation_id;
$$;

-- Text of a rule for a reservation: override, language of the reservation, variables filled in.
create or replace function public.message_rule_text(p_rule public.message_rules, p_reservation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(
      coalesce(o.body, p_rule.body ->> r.locale, p_rule.body ->> 'sk', (select value from jsonb_each_text(p_rule.body) limit 1), ''),
      '{meno}', split_part(btrim(r.guest_name), ' ', 1)),
      '{príchod}', to_char(x.check_in, 'FMDD. FMMM. YYYY')),
      '{odchod}', to_char(x.check_out, 'FMDD. FMMM. YYYY')),
      '{podpis}', coalesce(nullif(btrim(s.contact_name), ''), t.name)),
      '{odkaz na hodnotenie}', coalesce(
        (select 'https://' || d.hostname from public.tenant_domains d
         where d.tenant_id = r.tenant_id and d.hostname not like '%.localhost' order by d.is_primary desc limit 1), '')
        || '/ucet/pobyt/' || r.id || '/hodnotenie')
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  left join public.message_overrides o on o.reservation_id = r.id and o.rule_id = p_rule.id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  where r.id = p_reservation_id;
$$;

-- Scheduled (not yet sent) automatic messages of a reservation for the team: when, text, left out or changed.
create or replace function public.scheduled_messages(p_reservation_id uuid)
returns table (rule_id uuid, rule_name jsonb, send_at timestamptz, body text, skipped boolean, changed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.reservations where id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_member(v_tenant) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select ru.id, ru.name, public.message_rule_at(ru, p_reservation_id), public.message_rule_text(ru, p_reservation_id),
    coalesce(o.skip, false), o.body is not null
  from public.message_rules ru
  join public.reservations r on r.id = p_reservation_id
  left join public.message_overrides o on o.reservation_id = p_reservation_id and o.rule_id = ru.id
  where ru.tenant_id = v_tenant and ru.enabled and r.status <> 'cancelled' and r.source not in ('booking', 'airbnb')
    and not exists (select 1 from public.messages m where m.reservation_id = p_reservation_id and m.rule_id = ru.id)
    and public.message_rule_at(ru, p_reservation_id) > now()
  order by 3;
end;
$$;

-- Leaving out / changing a scheduled message for one reservation (null body = the rule's text again).
create or replace function public.set_message_override(p_reservation_id uuid, p_rule_id uuid, p_skip boolean,
  p_body text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select r.tenant_id into v_tenant from public.reservations r
  join public.message_rules ru on ru.id = p_rule_id and ru.tenant_id = r.tenant_id
  where r.id = p_reservation_id;
  if v_tenant is null or not public.is_tenant_staff(v_tenant) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not p_skip and nullif(btrim(p_body), '') is null then
    delete from public.message_overrides where reservation_id = p_reservation_id and rule_id = p_rule_id;
    return;
  end if;
  insert into public.message_overrides (reservation_id, rule_id, tenant_id, skip, body, updated_by)
  values (p_reservation_id, p_rule_id, v_tenant, p_skip, nullif(left(btrim(p_body), 4000), ''), auth.uid())
  on conflict (reservation_id, rule_id) do update set
    skip = excluded.skip, body = excluded.body, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

-- Every 5 minutes: due rules → messages. Once per rule and reservation, not for cancelled or portal reservations,
-- not when left out; time that had passed before the reservation (or the rule) existed is not caught up.
-- Welcome (right after the confirmation) goes inside the confirmation e-mail; a message on the day of the arrival
-- instructions or of an upsell offer goes inside that e-mail (email_via) — no double e-mails.
create or replace function public.messages_tick()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_count integer := 0;
  v_via text;
  v_text text;
begin
  for v in
    select ru, r.id as reservation_id, r.tenant_id, t.timezone, public.message_rule_at(ru, r.id) as at
    from public.message_rules ru
    join public.tenants t on t.id = ru.tenant_id
    join public.reservations r on r.tenant_id = ru.tenant_id
    join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                  from public.reservation_items i where i.reservation_id = r.id) x on true
    where ru.enabled
      and r.status in ('confirmed', 'in_progress', 'completed') and r.source not in ('booking', 'airbnb')
      and x.check_out >= (now() at time zone t.timezone)::date - 60
      and public.is_module_enabled(ru.tenant_id, 'messages')
      and not exists (select 1 from public.messages m where m.reservation_id = r.id and m.rule_id = ru.id)
      and not exists (select 1 from public.message_overrides o where o.reservation_id = r.id and o.rule_id = ru.id
                      and o.skip)
  loop
    continue when v.at is null or v.at > now() or v.at < (v.ru).created_at - interval '1 minute';
    -- Not caught up: due before the reservation was made (bookings at the last minute).
    continue when v.at < (select created_at from public.reservations where id = v.reservation_id) - interval '1 minute'
      and (v.ru).anchor <> 'confirmed';
    v_text := public.message_rule_text(v.ru, v.reservation_id);
    continue when coalesce(btrim(v_text), '') = '';
    v_via := case
      when (v.ru).anchor = 'confirmed' and (v.ru).offset_days = 0 then 'guest_confirmed'
      else (select o.kind from public.email_outbox o
            where o.reservation_id = v.reservation_id and o.kind in ('guest_arrival', 'guest_upsell_offer')
              and (o.created_at at time zone v.timezone)::date = (now() at time zone v.timezone)::date
            order by o.created_at limit 1)
      end;
    insert into public.messages (tenant_id, reservation_id, sender, rule_id, body, email_via)
    values (v.tenant_id, v.reservation_id, 'auto', (v.ru).id, left(v_text, 4000), v_via)
    on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('messages-tick', '*/5 * * * *', $$select public.messages_tick()$$);

-- ---------------------------------------------------------------------------
-- E-mails and notifications
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'guest_received', 'guest_reminder', 'guest_confirmed', 'guest_cancelled', 'guest_arrival',
  'owner_new', 'owner_expired', 'owner_cancel_request', 'owner_ical_conflict',
  'guest_review_invite', 'guest_review_reminder', 'guest_review_rejected',
  'guest_order_received', 'guest_order_confirmed', 'guest_order_declined',
  'guest_checkin_reminder', 'guest_upsell_offer', 'guest_message', 'owner_message'));
-- Several messages within 15 minutes = one e-mail: one waiting e-mail per conversation and direction.
create unique index email_outbox_message_queued_idx on public.email_outbox (reservation_id, kind)
  where kind in ('guest_message', 'owner_message') and status = 'queued';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion', 'message_new']::text[]);

-- A new message: the guest's → bell (and push) + e-mail to the owner after 15 minutes (not sent when the team has
-- read it by then); the team's or an automatic one → e-mail to the guest after 15 minutes (merged), unless it went
-- inside another e-mail.
create or replace function public.message_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender = 'guest' then
    perform public.notify(new.tenant_id, 'tenant', 'message_new',
      public.reservation_notice(new.reservation_id) || jsonb_build_object('excerpt', left(new.body, 140)),
      '/admin/reservations?panel=reservation:' || new.reservation_id || '&tab=messages', 'message_new:' || new.id);
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload, send_after)
    values (new.tenant_id, new.reservation_id, 'owner_message', jsonb_build_object('since', new.created_at),
      now() + interval '15 minutes')
    on conflict (reservation_id, kind) where kind in ('guest_message', 'owner_message') and status = 'queued'
    do nothing;
  elsif new.email_via is null then
    insert into public.email_outbox (tenant_id, reservation_id, kind, payload, send_after)
    values (new.tenant_id, new.reservation_id, 'guest_message', jsonb_build_object('since', new.created_at),
      now() + interval '15 minutes')
    on conflict (reservation_id, kind) where kind in ('guest_message', 'owner_message') and status = 'queued'
    do nothing;
  end if;
  return new;
end;
$$;

create trigger messages_events after insert on public.messages
  for each row execute function public.message_events();

-- With the module: a "Poďakovanie" with the review link (an enabled rule after departure containing
-- {odkaz na hodnotenie}) replaces the separate review invitation; the reminder after 7 days stays (counted from the
-- thank-you message). reviews_tick as in 20261017200000_reviews.sql otherwise.
create or replace function public.messages_review_rule(p_tenant_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ru.id from public.message_rules ru
  where ru.tenant_id = p_tenant_id and ru.enabled and ru.anchor = 'check_out' and ru.offset_days >= 0
    and ru.body::text like '%{odkaz na hodnotenie}%'
    and public.is_module_enabled(p_tenant_id, 'messages')
  order by ru.offset_days limit 1;
$$;

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
  v_rows integer;
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
    and public.messages_review_rule(r.tenant_id) is null
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

  -- Reminder 7 days after the thank-you message with the review link (module messages).
  insert into public.email_outbox (tenant_id, reservation_id, kind)
  select m.tenant_id, m.reservation_id, 'guest_review_reminder'
  from public.messages m
  join public.message_rules ru on ru.id = m.rule_id
  where m.sender = 'auto' and ru.body::text like '%{odkaz na hodnotenie}%'
    and m.created_at <= now() - interval '7 days' and m.created_at > now() - interval '30 days'
    and public.is_module_enabled(m.tenant_id, 'reviews')
    and public.review_eligibility(m.reservation_id) = 'ok'
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_reminders := v_reminders + v_rows;

  return jsonb_build_object('published', v_published, 'invites', v_invites, 'reminders', v_reminders);
end;
$$;

revoke execute on function public.message_events(), public.messages_tick(), public.message_rule_at(public.message_rules, uuid),
  public.message_rule_text(public.message_rules, uuid), public.messages_review_rule(uuid)
  from public, anon, authenticated;
revoke execute on function public.send_message(uuid, text, text), public.mark_messages_read(uuid, text),
  public.messages_for(uuid, text), public.messages_waiting(uuid), public.message_inbox(uuid, text, text),
  public.scheduled_messages(uuid), public.set_message_override(uuid, uuid, boolean, text) from public;
grant execute on function public.send_message(uuid, text, text), public.mark_messages_read(uuid, text),
  public.messages_for(uuid, text) to anon, authenticated, service_role;
grant execute on function public.messages_waiting(uuid), public.message_inbox(uuid, text, text),
  public.scheduled_messages(uuid), public.set_message_override(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.messages_tick(), public.message_rule_text(public.message_rules, uuid),
  public.message_rule_at(public.message_rules, uuid), public.messages_review_rule(uuid) to service_role;
