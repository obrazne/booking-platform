import "server-only";
import { cookies } from "next/headers";
import { getMemberships, type Membership } from "@/core/auth/session";

export const ACTIVE_TENANT_COOKIE = "active_tenant";

/**
 * Tenant the signed-in user is working in. Stored in a cookie for users with several memberships and
 * always validated against the memberships (a forged cookie falls back to the first membership).
 */
export async function getActiveMembership(): Promise<Membership | null> {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const wanted = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value;
  return memberships.find((m) => m.tenantId === wanted) ?? memberships[0]!;
}
