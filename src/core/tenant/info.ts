import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  locales: string[];
  defaultLocale: string;
  currency: string;
  timezone: string;
  country: string;
};

/** Settings of a tenant the signed-in user belongs to (RLS). */
export const getTenantInfo = cache(async (tenantId: string): Promise<TenantInfo> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug, locales, default_locale, currency, timezone, country")
    .eq("id", tenantId)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    locales: data.locales,
    defaultLocale: data.default_locale,
    currency: data.currency,
    timezone: data.timezone,
    country: data.country,
  };
});

/** Public address of the tenant's guest page (primary domain; local *.localhost hosts only in development). */
export const getGuestSiteUrl = cache(async (tenantId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_domains")
    .select("hostname, is_primary")
    .eq("tenant_id", tenantId);
  const domains = data ?? [];
  const pub = (d: { hostname: string }) => !d.hostname.endsWith(".localhost");
  const host =
    domains.find((d) => d.is_primary && pub(d))?.hostname ??
    domains.find(pub)?.hostname ??
    (process.env.NODE_ENV !== "production" ? domains[0]?.hostname : undefined);
  if (!host) return null;
  return host.endsWith(".localhost")
    ? `http://${host}:${process.env.PORT ?? 3000}`
    : `https://${host}`;
});
