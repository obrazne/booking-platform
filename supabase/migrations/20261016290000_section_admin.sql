-- Sections in the admin (Z18): the owner may reset the page of their property to a template.
create or replace function public.owner_reset_sections(p_property_id uuid, p_template text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.properties where id = p_property_id;
  if v_tenant is null or not public.is_tenant_owner(v_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public.apply_section_template(p_property_id, p_template, true);
end;
$$;

revoke execute on function public.owner_reset_sections(uuid, text) from public, anon, authenticated;
grant execute on function public.owner_reset_sections(uuid, text) to authenticated;
