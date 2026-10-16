import "server-only";
import { getActiveMembership } from "@/core/tenant/active";
import type { ActionResult } from "./form";

/** Maps a database error to a translation key under forms.errors. */
export function dbErrorKey(error: { code?: string } | null | undefined): string {
  switch (error?.code) {
    case "23505":
      return "duplicate";
    case "23P01":
      return "overlap";
    case "42501":
      return "forbidden";
    case "23514":
    case "22023":
    case "22P02":
      return "invalid";
    default:
      return "generic";
  }
}

export function ok(): ActionResult {
  return { ok: true, at: Date.now() };
}

export function fail(error: string): ActionResult {
  return { ok: false, error, at: Date.now() };
}

/** Active tenant of the signed-in user, required by every admin action. */
export async function requireTenant() {
  const active = await getActiveMembership();
  if (!active) throw new Error("No active tenant");
  return active;
}
