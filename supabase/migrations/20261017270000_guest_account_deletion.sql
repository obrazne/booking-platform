-- Guest account v2.4 (Z43): a guest may ask to close their account. The owner is told (notification) and decides;
-- data the law requires to keep (book of guests, documents) stay until the end of their period.

alter table public.guests add column deletion_requested_at timestamptz;

comment on column public.guests.deletion_requested_at is 'When the guest asked to close the account (Z43); handled by the owner.';

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion'));

alter table public.push_subscriptions drop constraint push_subscriptions_kinds_check;
alter table public.push_subscriptions add constraint push_subscriptions_kinds_check check (kinds <@ array[
  'reservation_new', 'payment_due', 'payment_received', 'cancel_request', 'reservation_cancelled',
  'portal_booking', 'calendar_conflict', 'sync_failed', 'trial_ending',
  'client_sync_failed', 'client_emails_failed', 'client_trial_ending', 'client_new',
  'review_new', 'review_publishing', 'order_new', 'order_awaiting', 'checkin_completed', 'foreigner_unreported',
  'account_deletion']::text[]);

-- The signed-in guest asks to close their account at this client; once (repeated requests do nothing new).
create or replace function public.request_account_deletion(p_tenant_id uuid, p_note text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
begin
  select id, name, deletion_requested_at into v_guest
  from public.guests where id = public.current_guest_id(p_tenant_id);
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_guest.deletion_requested_at is not null then
    return v_guest.deletion_requested_at;
  end if;
  update public.guests set deletion_requested_at = now() where id = v_guest.id;
  perform public.notify(p_tenant_id, 'tenant', 'account_deletion',
    jsonb_build_object('guest', v_guest.name, 'note', left(nullif(btrim(p_note), ''), 300)),
    null, 'account_deletion:' || v_guest.id);
  return now();
end;
$$;

revoke execute on function public.request_account_deletion(uuid, text) from public, anon;
grant execute on function public.request_account_deletion(uuid, text) to authenticated;
