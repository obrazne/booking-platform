-- Data for the approved guest page visual (docs/vizual-stranka-hosta.md): headline second sentence, owner contact
-- (WhatsApp, phone), link back to the client's website, service images, and the Roboto / JetBrains Mono type palette.

alter table public.properties
  add column tagline jsonb not null default '{}'::jsonb;

comment on column public.properties.tagline is 'Second sentence of the two-sentence headline, e.g. "Celý len pre vás." (translatable).';

alter table public.tenant_settings
  add column website_url text,
  add column contact_name text,
  add column contact_phone text,
  add column whatsapp_phone text;

comment on column public.tenant_settings.whatsapp_phone is 'Number for wa.me links in international format without + (e.g. 421905109393).';

alter table public.services
  add column image_path text;

-- Type palette: Roboto for everything and JetBrains Mono for labels join the selectable fonts.
alter table public.tenant_themes drop constraint tenant_themes_heading_font_check;
alter table public.tenant_themes drop constraint tenant_themes_body_font_check;
alter table public.tenant_themes add constraint tenant_themes_heading_font_check
  check (heading_font in ('geist', 'inter', 'manrope', 'lora', 'playfair', 'roboto'));
alter table public.tenant_themes add constraint tenant_themes_body_font_check
  check (body_font in ('geist', 'inter', 'manrope', 'lora', 'playfair', 'roboto'));
alter table public.tenant_themes alter column heading_font set default 'roboto';
alter table public.tenant_themes alter column body_font set default 'roboto';
alter table public.tenant_themes alter column primary_color set default '#2f5d50';
alter table public.tenant_themes alter column radius set default 16;

-- Guests need the owner contact and website link (public by nature); exposed through a narrow function.
create or replace function public.tenant_public_contact(p_tenant_id uuid)
returns table (website_url text, contact_name text, contact_phone text, whatsapp_phone text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.website_url, s.contact_name, s.contact_phone, s.whatsapp_phone
  from public.tenant_settings s
  where s.tenant_id = p_tenant_id and public.is_active_tenant(p_tenant_id);
$$;

revoke execute on function public.tenant_public_contact(uuid) from public, anon, authenticated;
grant execute on function public.tenant_public_contact(uuid) to anon, authenticated;
