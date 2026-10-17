-- Notifications about calendars go with them too: a removed portal stay or calendar leaves no stale
-- "Booking.com obsadil termín" / conflict / failed sync in the bell.

create or replace function public.delete_occupancy_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'ical' then
    delete from public.notifications
    where tenant_id = old.tenant_id
      and (dedupe_key = 'portal_booking:' || old.id or dedupe_key like 'calendar_conflict:' || old.id || ':%');
  end if;
  return old;
end;
$$;

create trigger occupancy_delete_notifications after delete on public.occupancy
  for each row execute function public.delete_occupancy_notifications();

create or replace function public.delete_channel_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where tenant_id = old.tenant_id
    and (dedupe_key like 'sync_failed:' || old.id || ':%' or dedupe_key like 'client_sync_failed:' || old.id || ':%');
  return old;
end;
$$;

create trigger ical_channels_delete_notifications after delete on public.ical_channels
  for each row execute function public.delete_channel_notifications();

revoke execute on function public.delete_occupancy_notifications(), public.delete_channel_notifications()
  from public, anon, authenticated;

-- Leftovers: portal and conflict notifications whose stay no longer exists.
delete from public.notifications n
where n.kind in ('portal_booking', 'calendar_conflict')
  and n.dedupe_key not like 'demo:%'
  and not exists (
    select 1 from public.occupancy o where n.dedupe_key like '%' || o.id || '%');
