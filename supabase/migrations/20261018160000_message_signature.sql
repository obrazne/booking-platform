-- Z60: signature of the messages. {podpis} = the signature the client writes in Nastavenia → Kontakt (several lines,
-- e.g. "Jana Hladká · Chalet STRÖMY · +421…"), else the contact person's name, else the client's name.

alter table public.tenant_settings add column message_signature text
  check (message_signature is null or length(message_signature) <= 500);

comment on column public.tenant_settings.message_signature is
  'Signature of messages to guests ({podpis}); empty → contact_name → the client''s name.';

-- message_rule_text as in 20261017290000_messages.sql; changed: {podpis} takes the signature first.
create or replace function public.message_rule_text(p_rule public.message_rules, p_reservation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(
      coalesce(o.body, p_rule.body ->> r.locale, p_rule.body ->> 'sk', (select value from jsonb_each_text(p_rule.body) limit 1), ''),
      '{meno}', split_part(btrim(r.guest_name), ' ', 1)),
      '{príchod}', to_char(x.check_in, 'FMDD. FMMM. YYYY')),
      '{odchod}', to_char(x.check_out, 'FMDD. FMMM. YYYY')),
      '{podpis}', coalesce(nullif(btrim(s.message_signature), ''), nullif(btrim(s.contact_name), ''), t.name)),
      '{odkaz na hodnotenie}', coalesce(
        (select 'https://' || d.hostname from public.tenant_domains d
         where d.tenant_id = r.tenant_id and d.hostname not like '%.localhost' order by d.is_primary desc limit 1), '')
        || '/ucet/pobyt/' || r.id || '/hodnotenie')
  from public.reservations r
  join public.tenants t on t.id = r.tenant_id
  left join public.tenant_settings s on s.tenant_id = r.tenant_id
  left join public.message_overrides o on o.reservation_id = r.id and o.rule_id = p_rule.id
  join lateral (select min(i.check_in) as check_in, max(i.check_out) as check_out
                from public.reservation_items i where i.reservation_id = r.id) x on true
  where r.id = p_reservation_id;
$$;
