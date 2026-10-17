import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getMemberships, isPlatformAdmin, type Membership } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_TENANT_COOKIE = "active_tenant";
/**
 * Tenant the platform admin opened from the control center ("Pozrieť sa ako klient", A4). Valid only together with
 * the platform admin role (checked on every request); the database rights are the existing ones of the admin.
 */
export const ADMIN_VIEW_COOKIE = "admin_view_tenant";

export type ActiveMembership = Membership & { adminView?: boolean };

/**
 * Tenant the signed-in user is working in. Stored in a cookie for users with several memberships and
 * always validated against the memberships (a forged cookie falls back to the first membership).
 * A platform admin who opened a client from the control center works in it without being a member.
 */
export const getActiveMembership = cache(async (): Promise<ActiveMembership | null> => {
  const jar = await cookies();
  const viewing = jar.get(ADMIN_VIEW_COOKIE)?.value;
  if (viewing && /^[0-9a-f-]{36}$/.test(viewing) && (await isPlatformAdmin())) {
    const { data } = await (
      await createClient()
    )
      .from("tenants")
      .select("id, name, slug")
      .eq("id", viewing)
      .maybeSingle();
    if (data) {
      return {
        tenantId: data.id,
        tenantName: data.name,
        tenantSlug: data.slug,
        role: "owner",
        adminView: true,
      };
    }
  }
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const wanted = jar.get(ACTIVE_TENANT_COOKIE)?.value;
  return memberships.find((m) => m.tenantId === wanted) ?? memberships[0]!;
});
