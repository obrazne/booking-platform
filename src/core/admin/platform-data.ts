import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Test accounts of the automated tests — never shown as a client's contact (v1.1, rule 9). */
export const isTestAccount = (email: string | null | undefined) =>
  Boolean(email && /@booking-platform\.test$/i.test(email));

/** Public address of a client: its domain, never the development `*.localhost` (v1.1, rule 9). */
export function publicDomain(domains: { hostname: string; is_primary: boolean }[]): string | null {
  const pub = domains.filter((d) => !d.hostname.endsWith(".localhost"));
  return (pub.find((d) => d.is_primary) ?? pub[0])?.hostname ?? null;
}

/** Clients for the control center with modules, theme and people (platform admin, RLS). */
export async function loadTenants() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, created_at, tenant_domains(hostname, is_primary), tenant_modules(module_key, status, trial_ends_at), tenant_themes(primary_color, heading_font, body_font, background_color), memberships(role, profile:profiles(email, full_name))",
    )
    .order("name");
  return (data ?? []).map((t) => {
    const people = t.memberships.filter((m) => !isTestAccount(m.profile?.email));
    const owner = people.find((m) => m.role === "owner")?.profile ?? null;
    return { ...t, people, owner, domain: publicDomain(t.tenant_domains) };
  });
}

export type ControlTenant = Awaited<ReturnType<typeof loadTenants>>[number];
