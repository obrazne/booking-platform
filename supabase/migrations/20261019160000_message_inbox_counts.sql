-- Z63 (rule 7): the inbox is paged by the database (message_inbox with range + count from the page) and the filter
-- pills count here — the page no longer loads every conversation a second time only to count them.

create or replace function public.message_inbox_counts(p_tenant_id uuid)
returns table (all_count bigint, waiting bigint, upcoming bigint, past bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*),
    count(*) filter (where i.waiting),
    count(*) filter (where i.check_out >= (now() at time zone t.timezone)::date and i.status <> 'cancelled'),
    count(*) filter (where i.check_out < (now() at time zone t.timezone)::date or i.status = 'cancelled')
  from public.message_inbox(p_tenant_id, 'all', null) i
  cross join (select timezone from public.tenants where id = p_tenant_id) t;
$$;

comment on function public.message_inbox_counts(uuid) is
  'Counts of the inbox filters (all, waiting for a reply, before arrival and during the stay, after departure) — Z63.';

revoke all on function public.message_inbox_counts(uuid) from public, anon;
grant execute on function public.message_inbox_counts(uuid) to authenticated;
