-- Online check-in (Z36): read models for the team — one person for the police form, upcoming arrivals with the state
-- of check-in and reports, and the monthly tax for accommodation (ages computed here, dates of birth never leave).

-- Non-sensitive data of one person with the stay (the form reads the sensitive part through reveal_checkin_guest).
create or replace function public.checkin_people_by_id(p_guest_id uuid)
returns table (first_name text, last_name text, reservation_number text, check_in date, check_out date,
  property_name text, property_address text, tenant_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.checkin_guests where id = p_guest_id;
  if v_tenant is null or not public.is_tenant_member(v_tenant) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select g.first_name, g.last_name, r.number,
    (select min(i.check_in) from public.reservation_items i where i.reservation_id = r.id),
    (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id),
    p.name, concat_ws(', ', p.street, nullif(concat_ws(' ', p.postal_code, p.city), '')), t.name
  from public.checkin_guests g
  join public.reservations r on r.id = g.reservation_id
  join public.properties p on p.id = r.property_id
  join public.tenants t on t.id = g.tenant_id
  where g.id = p_guest_id;
end;
$$;

-- Upcoming arrivals (and stays in progress) with the state of check-in and of reports of foreigners.
create or replace function public.arrivals_overview(p_tenant_id uuid, p_days integer default 30)
returns table (reservation_id uuid, number text, guest_name text, property_name text, check_in date, check_out date,
  persons integer, checkin_status text, people integer, foreigners integer, unreported integer, report_due date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date;
begin
  if not public.is_tenant_member(p_tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select (now() at time zone t.timezone)::date into v_today from public.tenants t where t.id = p_tenant_id;
  return query
  select r.id, r.number, r.guest_name, p.name, x.check_in, x.check_out,
    (r.adults + r.children + r.infants)::int,
    coalesce(c.status, 'not_started'),
    (select count(*)::int from public.checkin_guests g where g.reservation_id = r.id),
    (select count(*)::int from public.checkin_guests g where g.reservation_id = r.id and not g.is_citizen),
    (select count(*)::int from public.checkin_guests g where g.reservation_id = r.id and not g.is_citizen
       and g.reported_at is null and g.purged_at is null),
    x.check_in + (public.checkin_rules(t.country) ->> 'foreigner_report_days')::int
  from public.reservations r
  join public.properties p on p.id = r.property_id
  join public.tenants t on t.id = r.tenant_id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  left join public.checkins c on c.reservation_id = r.id
  where r.tenant_id = p_tenant_id and r.status in ('confirmed', 'in_progress', 'completed')
    and r.source not in ('booking', 'airbnb')
    and x.check_out >= v_today - 5 and x.check_in <= v_today + greatest(1, least(p_days, 120))
  order by x.check_in, r.number;
end;
$$;

-- Tax for accommodation of stays arriving in a month: paying and exempt persons by age on arrival (completed
-- check-in), otherwise adults pay and children not (reservation).
create or replace function public.city_tax_month(p_tenant_id uuid, p_month date)
returns table (reservation_id uuid, number text, guest_name text, check_in date, check_out date, nights integer,
  paying integer, exempt integer, source text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_exempt_under integer;
begin
  if not public.is_tenant_staff(p_tenant_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select coalesce(s.city_tax_exempt_under, 18) into v_exempt_under
  from public.tenants t left join public.tenant_settings s on s.tenant_id = t.id where t.id = p_tenant_id;
  return query
  select r.id, r.number, r.guest_name, x.check_in, x.check_out, (x.check_out - x.check_in)::int,
    case when c.status = 'completed' then
      (select count(*)::int from public.checkin_guests g where g.reservation_id = r.id
        and (g.birth_date is null or extract(year from age(x.check_in, g.birth_date)) >= v_exempt_under))
      else r.adults::int end,
    case when c.status = 'completed' then
      (select count(*)::int from public.checkin_guests g where g.reservation_id = r.id
        and g.birth_date is not null and extract(year from age(x.check_in, g.birth_date)) < v_exempt_under)
      else (r.children + r.infants)::int end,
    case when c.status = 'completed' then 'checkin' else 'reservation' end
  from public.reservations r
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  left join public.checkins c on c.reservation_id = r.id
  where r.tenant_id = p_tenant_id and r.status in ('confirmed', 'in_progress', 'completed')
    and r.source not in ('booking', 'airbnb')
    and x.check_in >= date_trunc('month', p_month)::date
    and x.check_in < (date_trunc('month', p_month) + interval '1 month')::date
  order by x.check_in, r.number;
end;
$$;

revoke execute on function public.checkin_people_by_id(uuid), public.arrivals_overview(uuid, integer),
  public.city_tax_month(uuid, date) from public, anon;
grant execute on function public.checkin_people_by_id(uuid), public.arrivals_overview(uuid, integer),
  public.city_tax_month(uuid, date) to authenticated;
