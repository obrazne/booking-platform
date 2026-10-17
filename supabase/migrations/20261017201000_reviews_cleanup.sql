-- Notifications of a deleted review go with it (test data, demo reset): the bell never points to a missing review.

create or replace function public.delete_review_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where tenant_id = old.tenant_id and dedupe_key in ('review_new:' || old.id, 'review_publishing:' || old.id);
  return old;
end;
$$;

create trigger reviews_delete_notifications after delete on public.reviews
  for each row execute function public.delete_review_notifications();

revoke execute on function public.delete_review_notifications() from public, anon, authenticated;
