-- Guest search (B2, B7): active units of published properties of a tenant that are free for the whole stay.
create or replace function public.free_units(p_tenant_id uuid, p_check_in date, p_check_out date)
returns table (unit_id uuid, property_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.property_id
  from public.units u
  join public.properties p on p.id = u.property_id
  where u.tenant_id = p_tenant_id
    and u.active
    and public.is_public_property(p.id)
    and p_check_out > p_check_in
    and not exists (
      select 1 from public.occupancy o
      where o.unit_id = u.id and o.is_blocking
        and (o.kind <> 'hold' or o.expires_at > now())
        and o.nights && daterange(p_check_in, p_check_out + p.cleaning_gap_days, '[)')
    );
$$;

revoke execute on function public.free_units(uuid, date, date) from public, anon, authenticated;
grant execute on function public.free_units(uuid, date, date) to anon, authenticated;
