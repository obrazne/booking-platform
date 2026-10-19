-- Z63 (rule 7): the audit is paged by the database. Search runs in SQL over the client, the person and the action — the
-- page loads one page (range) and the total count instead of up to 2000 rows filtered in memory.
-- security_invoker: the view reads with the caller's rights, so the RLS of audit_log, tenants and profiles applies as before.

create view public.audit_log_search
with (security_invoker = true) as
select
  a.id,
  a.tenant_id,
  a.actor_id,
  a.action,
  a.entity,
  a.entity_id,
  a.data,
  a.created_at,
  t.name as tenant_name,
  p.full_name as actor_name,
  p.email as actor_email,
  lower(concat_ws(' ', t.name, p.full_name, p.email, a.action, a.entity_id)) as search
from public.audit_log a
left join public.tenants t on t.id = a.tenant_id
left join public.profiles p on p.id = a.actor_id;

comment on view public.audit_log_search is
  'Audit entries with client and person names for searching and paging in SQL (Z63). Rights of the caller (security_invoker).';

grant select on public.audit_log_search to authenticated;

-- Newest first for one client or for all: the existing (tenant_id, created_at) index covers the client tab, this one
-- the whole-platform list.
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
