import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MembershipRole = "owner" | "reception" | "cleaning";

export type Membership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: MembershipRole;
};

/** Signed-in user verified against the auth server's signing keys, or null. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
});

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, tenant:tenants(id, name, slug)")
    .eq("user_id", user.id);
  if (error || !data) return [];
  return data.flatMap((row) =>
    row.tenant
      ? [
          {
            tenantId: row.tenant.id,
            tenantName: row.tenant.name,
            tenantSlug: row.tenant.slug,
            role: row.role as MembershipRole,
          },
        ]
      : [],
  );
});

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
});
