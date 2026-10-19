-- Z69: the connected Stripe account is set only by the connection flow (service role), never through the settings
-- form — otherwise an owner could switch card payments on without a real Stripe account. Only adds.

create or replace function public.tenant_settings_stripe_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') in ('authenticated', 'anon')
     and new.stripe_account_id is distinct from (case when tg_op = 'UPDATE' then old.stripe_account_id end) then
    raise exception 'stripe account is set by the connection flow' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tenant_settings_stripe_guard before insert or update on public.tenant_settings
  for each row execute function public.tenant_settings_stripe_guard();
