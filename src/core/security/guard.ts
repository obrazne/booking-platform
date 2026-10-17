import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "./turnstile";

/** Guest form actions limited per IP address. */
export type GuardedAction = "reservation" | "promo" | "login_code" | "login_verify" | "staff_link";

/** Most attempts per IP and hour (generous for a family behind one router, tight for a script). */
export const REQUEST_LIMITS: Record<GuardedAction, number> = {
  reservation: 10,
  promo: 30,
  login_code: 10,
  login_verify: 30,
  staff_link: 10,
};

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Client IP from the proxy headers (Vercel sets x-forwarded-for; the first address is the client). */
export function ipFromHeaders(h: Pick<Headers, "get">): string | null {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || null;
}

/** Keyed hash of the IP — the address itself is never stored. */
export function hashIp(ip: string): string {
  const key = process.env.FORM_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? "";
  return createHmac("sha256", key).update(`ip:${ip}`).digest("base64url");
}

export async function clientIp(): Promise<string | null> {
  return ipFromHeaders(await headers());
}

/**
 * Records the attempt and answers whether the IP is still within the hourly limit. Requests without a public IP
 * (local server, Playwright) are not limited. A database failure does not block guests — the captcha still applies.
 */
export async function withinRequestLimit(
  tenantId: string | null,
  action: GuardedAction,
  ip: string | null,
): Promise<boolean> {
  if (!ip || LOOPBACK.has(ip)) return true;
  const { data, error } = await createAdminClient().rpc("hit_request_limit", {
    p_tenant_id: tenantId as string, // null for actions outside a tenant (admin sign-in link)
    p_ip_hash: hashIp(ip),
    p_action: action,
    p_max: REQUEST_LIMITS[action],
    p_window_seconds: 3600,
  });
  return error ? true : data !== false;
}

/**
 * Bot protection of a guest form action: IP limit first, then the Turnstile token (skipped without keys).
 * Returns null when the action may continue.
 */
export async function guardGuestAction(
  tenantId: string | null,
  action: GuardedAction,
  token: string | null | undefined,
  { captcha = true }: { captcha?: boolean } = {},
): Promise<null | "limit" | "captcha"> {
  const ip = await clientIp();
  if (!(await withinRequestLimit(tenantId, action, ip))) return "limit";
  if (captcha && !(await verifyTurnstile(token, ip))) return "captcha";
  return null;
}
