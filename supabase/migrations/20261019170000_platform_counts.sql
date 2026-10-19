-- Z63 (rule 7): the control center's client list is paged by the database. Instead of loading every reservation of the
-- last 30 days and every failed e-mail only to count them, the page asks for the counts.

-- Reservations created since p_since, per client (only the clients asked for; null = all). Platform admin only.
create or replace function public.platform_reservation_counts(p_since timestamptz, p_tenants uuid[] default null)
returns table (tenant_id uuid, reservations bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.tenant_id, count(*)
  from public.reservations r
  where public.is_platform_admin()
    and r.created_at >= p_since
    and (p_tenants is null or r.tenant_id = any (p_tenants))
  group by r.tenant_id;
$$;

-- Clients with a problem: a calendar channel in error / conflict or an e-mail that failed. Platform admin only.
create or replace function public.platform_issue_tenants()
returns table (tenant_id uuid, bad_channels bigint, failed_emails bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select x.tenant_id, sum(x.channels)::bigint, sum(x.emails)::bigint
  from (
    select c.tenant_id, 1 as channels, 0 as emails
    from public.ical_channels c where c.last_status in ('error', 'conflict')
    union all
    select o.tenant_id, 0, 1
    from public.email_outbox o where o.status = 'failed' and o.tenant_id is not null
  ) x
  where public.is_platform_admin()
  group by x.tenant_id;
$$;

revoke all on function public.platform_reservation_counts(timestamptz, uuid[]) from public, anon;
revoke all on function public.platform_issue_tenants() from public, anon;
grant execute on function public.platform_reservation_counts(timestamptz, uuid[]) to authenticated;
grant execute on function public.platform_issue_tenants() to authenticated;
