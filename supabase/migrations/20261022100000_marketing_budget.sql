-- Z75: Mesačný výpis — the saved commission as the budget for own marketing (A10). Only adds:
--   * tenant_marketing_spend: what the owner spent on marketing in a month (optional, by hand at the report);
--   * tenant_marketing_budget: the spend of the month and the sums since the start of the platform (the budget = the
--     commission saved against the portal, the same calculation as saved_cents of tenant_monthly_report).

create table public.tenant_marketing_spend (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  amount_cents bigint not null check (amount_cents >= 0 and amount_cents <= 100000000),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, month)
);

comment on table public.tenant_marketing_spend is
  'Z75: what a client spent on own marketing in a month (marketer, ads) — compared with the saved commission.';

alter table public.tenant_marketing_spend enable row level security;
grant select, insert, update, delete on public.tenant_marketing_spend to authenticated;

-- Everyone of the client reads (the report); only the owner (and the platform admin) writes.
create policy tenant_marketing_spend_read on public.tenant_marketing_spend for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());
create policy tenant_marketing_spend_owner on public.tenant_marketing_spend for all to authenticated
  using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id));

create trigger record_history after insert or update or delete on public.tenant_marketing_spend
  for each row execute function public.record_history_capture('tenant_id', 'month');

-- The spend of the month and the sums from p_from (the first month of the report) to the month.
create or replace function public.tenant_marketing_budget(p_tenant_id uuid, p_from date, p_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_m date := date_trunc('month', p_month)::date;
  v_from date := date_trunc('month', least(coalesce(p_from, p_month), p_month))::date;
  v_bp integer;
  v_revenue bigint;
  v_spent bigint;
  v_spent_total bigint;
begin
  if not (public.is_platform_admin() or public.is_tenant_member(p_tenant_id)
          or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(st.portal_commission_bp, 1500) into v_bp
    from public.tenant_settings st where st.tenant_id = p_tenant_id;
  v_bp := coalesce(v_bp, 1500);
  select coalesce(sum(x.revenue_cents), 0) into v_revenue
    from public.tenant_monthly_stats(p_tenant_id, v_from, v_m) x;
  select s.amount_cents into v_spent
    from public.tenant_marketing_spend s where s.tenant_id = p_tenant_id and s.month = v_m;
  select coalesce(sum(s.amount_cents), 0) into v_spent_total
    from public.tenant_marketing_spend s
    where s.tenant_id = p_tenant_id and s.month >= v_from and s.month <= v_m;
  return jsonb_build_object(
    'since', v_from,
    'spent_cents', v_spent,
    'budget_total_cents', v_revenue * v_bp / 10000,
    'spent_total_cents', v_spent_total);
end;
$$;

comment on function public.tenant_marketing_budget(uuid, date, date) is
  'Z75: the marketing spend of a month and the sums since the first month (budget = saved commission).';

revoke execute on function public.tenant_marketing_budget(uuid, date, date) from public, anon;
grant execute on function public.tenant_marketing_budget(uuid, date, date) to authenticated, service_role;
