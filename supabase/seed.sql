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
select u.id from auth.users u where u.email = 'info@obrazne.sk'
on conflict (user_id) do nothing;

insert into public.tenant_themes (tenant_id, primary_color, secondary_color, heading_font, body_font, radius)
values
  ('a0000000-0000-4000-8000-000000000001', '#0071e3', '#ad5a2b', 'geist', 'geist', 10),
  ('a0000000-0000-4000-8000-000000000002', '#2f5d50', '#ad5a2b', 'roboto', 'roboto', 10)
on conflict (tenant_id) do nothing;

insert into public.tenant_modules (tenant_id, module_key, status, trial_ends_at)
values
  ('a0000000-0000-4000-8000-000000000001', 'services', 'active', null),
  ('a0000000-0000-4000-8000-000000000002', 'services', 'trial', current_date + 30)
on conflict (tenant_id, module_key) do nothing;
