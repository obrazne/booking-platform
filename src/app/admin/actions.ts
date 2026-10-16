"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getMemberships } from "@/core/auth/session";
import { ACTIVE_TENANT_COOKIE } from "@/core/tenant/active";

export async function switchTenant(tenantId: string) {
  const memberships = await getMemberships();
  if (!memberships.some((m) => m.tenantId === tenantId)) return;
  (await cookies()).set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
}
