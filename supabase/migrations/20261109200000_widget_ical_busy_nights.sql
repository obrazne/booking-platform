-- Widget on the client's website with data-obsadenost="ical" (Martin 9. 11.): busy nights only from the iCal of the
-- channels (Booking, Airbnb…), nothing from the application (reservations, blocks, holds). Events in conflict with the
-- application are included too: they are bookings on the channel, only not blocking here.
create or replace function public.unit_ical_busy_nights(p_unit_id uuid, p_from date, p_to date)
returns table (nights daterange)
language sql
stable
security definer
set search_path = ''
as $$
  select o.nights from public.occupancy o
  join public.units u on u.id = o.unit_id
  join public.ical_channels c on c.id = o.ical_channel_id
  where o.unit_id = p_unit_id and o.kind = 'ical' and c.active
    and o.nights && daterange(p_from, p_to, '[)')
    and public.is_public_property(u.property_id);
$$;

revoke execute on function public.unit_ical_busy_nights(uuid, date, date) from public, anon, authenticated;
grant execute on function public.unit_ical_busy_nights(uuid, date, date) to anon, authenticated;
