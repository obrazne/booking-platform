-- Notifications of a deleted reservation go with it (test data, demo reset, erasure of a guest's data):
-- the bell never points to a reservation that no longer exists, and keeps no guest name after deletion.

create or replace function public.delete_reservation_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where tenant_id = old.tenant_id and data ->> 'number' = old.number;
  return old;
end;
$$;

create trigger reservations_delete_notifications after delete on public.reservations
  for each row execute function public.delete_reservation_notifications();

revoke execute on function public.delete_reservation_notifications() from public, anon, authenticated;

-- Leftovers from before this rule: notifications of reservations that no longer exist.
delete from public.notifications n
where n.data ? 'number'
  and not exists (
    select 1 from public.reservations r where r.tenant_id = n.tenant_id and r.number = n.data ->> 'number');
