"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { renderLoginCode } from "@/core/email/templates";
import { sendEmail } from "@/core/email/send";
import { getTenantFromHost, type PublicTenant } from "@/core/tenant/current";
import { getTenantTheme } from "@/core/theme/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_EMAIL_COOKIE } from "./constants";

const CODES_PER_HOUR = 5;
const TENANT_CODES_PER_HOUR = 200;
const FAILS_PER_HOUR = 8;

export type LoginState = {
  step: "email" | "code";
  error: null | "invalid" | "limit" | "send" | "code";
};

const emailSchema = z.email().max(254);

async function attempts(tenantId: string, email: string | null, kind: string): Promise<number> {
  const admin = createAdminClient();
  let q = admin
    .from("guest_auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("kind", kind)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if (email) q = q.eq("email", email);
  const { count } = await q;
  return count ?? 0;
}

/**
 * Creates (if needed) the login identity and sends a one-time code through OUR e-mail in the tenant's colours —
 * not the shared Supabase e-mails (B10). The answer never reveals whether the e-mail has stays.
 */
async function sendCode(tenant: PublicTenant, email: string): Promise<LoginState["error"]> {
  if (
    (await attempts(tenant.id, email, "code_sent")) >= CODES_PER_HOUR ||
    (await attempts(tenant.id, null, "code_sent")) >= TENANT_CODES_PER_HOUR
  )
    return "limit";
  const admin = createAdminClient();
  let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: false });
    if (created.error) return "send";
    link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) return "send";
  }
  // Staff and platform admins sign in with a password in the admin — a guest code must not open their account.
  const userId = link.data.user.id;
  const [{ count: memberships }, { count: admins }] = await Promise.all([
    admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("platform_admins")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  await admin
    .from("guest_auth_attempts")
    .insert({ tenant_id: tenant.id, email, kind: "code_sent" });
  if ((memberships ?? 0) > 0 || (admins ?? 0) > 0) return null; // same answer as for anybody else
  const code = link.data.properties.email_otp;
  const theme = await getTenantTheme(tenant.id);
  const mail = renderLoginCode(
    { name: tenant.name, accent: theme.primaryColor, locale: tenant.defaultLocale },
    email,
    code,
  );
  const sent = await sendEmail(mail);
  return sent.ok ? null : "send";
}

async function rememberEmail(email: string) {
  (await cookies()).set(LOGIN_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600,
    path: "/ucet",
  });
}

export async function requestGuestCode(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { step: "email", error: "invalid" };
  const tenant = await getTenantFromHost();
  if (!tenant) return { step: "email", error: "send" };
  const error = await sendCode(tenant, parsed.data);
  if (error) return { step: "email", error };
  await rememberEmail(parsed.data);
  return { step: "code", error: null };
}

export async function verifyGuestCode(_: LoginState, form: FormData): Promise<LoginState> {
  const email = (await cookies()).get(LOGIN_EMAIL_COOKIE)?.value ?? "";
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const tenant = await getTenantFromHost();
  if (!tenant || !emailSchema.safeParse(email).success) return { step: "email", error: "invalid" };
  if (!/^\d{6,10}$/.test(code)) return { step: "code", error: "code" };
  if ((await attempts(tenant.id, email, "verify_failed")) >= FAILS_PER_HOUR) {
    return { step: "code", error: "limit" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    await createAdminClient()
      .from("guest_auth_attempts")
      .insert({ tenant_id: tenant.id, email, kind: "verify_failed" });
    return { step: "code", error: "code" };
  }
  // Past bookings with the now verified e-mail appear in the zone (B10).
  await supabase.rpc("claim_guest_account", { p_tenant_id: tenant.id });
  (await cookies()).delete({ name: LOGIN_EMAIL_COOKIE, path: "/ucet" });
  redirect("/ucet");
}

/** Back to entering the e-mail. */
export async function resetGuestLogin(): Promise<LoginState> {
  (await cookies()).delete({ name: LOGIN_EMAIL_COOKIE, path: "/ucet" });
  return { step: "email", error: null };
}

export async function signOutGuest() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** "Save your details for next stays" on the reservation page: sends the code to the e-mail of that reservation. */
export async function startAccountFromReservation(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) redirect("/ucet/prihlasenie");
  const tenant = await getTenantFromHost();
  if (!tenant) redirect("/ucet/prihlasenie");
  const { data } = await createAdminClient()
    .from("reservations")
    .select("guest_email, tenant_id")
    .eq("access_token_hash", createHash("sha256").update(token).digest("hex"))
    .maybeSingle();
  if (!data || data.tenant_id !== tenant.id) redirect("/ucet/prihlasenie");
  const email = data.guest_email.toLowerCase();
  const error = await sendCode(tenant, email);
  if (!error) await rememberEmail(email);
  redirect("/ucet/prihlasenie");
}
