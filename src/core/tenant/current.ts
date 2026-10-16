import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type PublicTenant = {
  id: string;
  slug: string;
  name: string;
  defaultLocale: string;
  locales: string[];
  currency: string;
  country: string;
};

/** Host of the current request; DEV_TENANT_HOST overrides it outside production (localhost, preview URLs). */
export async function requestHost(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_TENANT_HOST) {
    return process.env.DEV_TENANT_HOST;
  }
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host");
}

/** Tenant resolved from the request domain (A17), or null when the host is not a client domain. */
export const getTenantFromHost = cache(async (): Promise<PublicTenant | null> => {
  const host = await requestHost();
  if (!host) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tenant_by_host", { p_host: host }).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    defaultLocale: data.default_locale,
    locales: data.locales,
    currency: data.currency,
    country: data.country,
  };
});
