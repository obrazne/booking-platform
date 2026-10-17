-- Control center v1.2 (Z28): successful sign-ins to the administration and the control center go to the audit.
-- Only staff (people with a profile); guests sign in to their own zone and are not recorded here. Never a password
-- or the typed e-mail — only who (the signed-in user) and how (password / link).
-- The entry belongs to the client when the person works for exactly one, so the client filter and the owner's own
-- audit see it; platform admins and people of several clients have it without a client.

create or replace function public.audit_sign_in(p_method text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_tenant uuid;
begin
  if v_user is null or p_method not in ('password', 'link') then
    return;
  end if;
  if not exists (select 1 from public.profiles where id = v_user) then
    return;
  end if;
  if not public.is_platform_admin() and (select count(*) from public.memberships where user_id = v_user) = 1 then
    select tenant_id into v_tenant from public.memberships where user_id = v_user;
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, data)
  values (v_tenant, v_user, 'auth.signed_in', 'user', v_user::text, jsonb_build_object('method', p_method));
end;
$$;

revoke execute on function public.audit_sign_in(text) from public, anon;
grant execute on function public.audit_sign_in(text) to authenticated;

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_action_idx on public.audit_log (actor_id, action, created_at desc);
