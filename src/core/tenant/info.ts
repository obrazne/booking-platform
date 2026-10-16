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
