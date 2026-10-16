-- Seed for local development and staging. Idempotent. No guest data, no real secrets.

insert into public.tenants (id, slug, name, country, currency, default_locale, locales)
values
  ('a0000000-0000-4000-8000-000000000001', 'ukazka', 'Ukážkový klient', 'SK', 'EUR', 'sk', array['sk']),
  ('a0000000-0000-4000-8000-000000000002', 'stromy', 'Chalet STRÖMY', 'SK', 'EUR', 'sk', array['sk'])
on conflict (id) do nothing;

-- Local hostnames (http://ukazka.localhost:3000). Staging/production domains are added in the control center.
insert into public.tenant_domains (tenant_id, hostname, is_primary)
values
  ('a0000000-0000-4000-8000-000000000001', 'ukazka.localhost', true),
  ('a0000000-0000-4000-8000-000000000002', 'stromy.localhost', true)
on conflict (hostname) do nothing;

-- Martin is the platform admin once his auth user exists (created via invite, see CLAUDE.md).
insert into public.platform_admins (user_id)
select p.id from public.profiles p where p.email = 'info@obrazne.sk'
on conflict (user_id) do nothing;
