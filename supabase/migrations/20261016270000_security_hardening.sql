-- Security review before the demo (Z16). Fixes found by an independent review of the code.

-- H1: a signed-in guest may change only their contact details — never e-mail, tenant or login link
-- (otherwise they could take over future reservations of another e-mail, including access codes).
revoke update on public.guests from authenticated;
grant update (name, phone, country, marketing_consent, marketing_consent_at) on public.guests to authenticated;

-- M4: a user may change only their name and language; the e-mail mirrors auth and is used to find admins.
revoke update on public.profiles from authenticated;
grant update (full_name, locale) on public.profiles to authenticated;

-- M2: an invalid time zone would break scheduled e-mails for every tenant.
create or replace function public.tenants_check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown time zone %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger tenants_check_timezone before insert or update of timezone on public.tenants
  for each row execute function public.tenants_check_timezone();

-- H2 (database side): a guest hold is short and in the future; at most 3 open holds per unit at once,
-- so one visitor cannot block a whole calendar. (The server checks the same before calling create_hold.)
create or replace function public.occupancy_check_hold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'hold' then
    return new;
  end if;
  if upper(new.nights) - lower(new.nights) > 30 or lower(new.nights) < current_date - 1 then
    raise exception 'hold not allowed for this stay' using errcode = '22023';
  end if;
  if (select count(*) from public.occupancy o
      where o.unit_id = new.unit_id and o.kind = 'hold' and o.expires_at > now()) >= 3 then
    raise exception 'too many holds on this unit' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger occupancy_check_hold before insert on public.occupancy
  for each row execute function public.occupancy_check_hold();

-- M1: calendars are fetched over https only (the server checks addresses before every request too).
alter table public.ical_channels add constraint ical_channels_https check (import_url ~ '^https://') not valid;

-- L1: the export token of a unit is not public (the iCal link stays secret); guests read the other columns.
revoke select on public.units from anon;
grant select (id, tenant_id, property_id, name, description, max_guests, bedrooms, is_default, active, sort,
              created_at) on public.units to anon;

revoke execute on function public.tenants_check_timezone(), public.occupancy_check_hold() from public, anon, authenticated;
