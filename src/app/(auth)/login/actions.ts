"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { platformBrand } from "@/core/admin/brand";
import { renderStaffLoginLink } from "@/core/email/templates";
import { sendEmail } from "@/core/email/send";
import { guardGuestAction } from "@/core/security/guard";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: "invalidCredentials" | "missingFields" | "invalidEmail" | "limit" | null;
  /** The sign-in link was requested (the answer is the same whether the account exists or not). */
  linkSent?: boolean;
};

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  // Only paths on this site: "//evil", "/\evil" and anything with a scheme or host is refused.
  if (!/^\/(?![/\\])/.test(next)) return "/admin";
  try {
    const url = new URL(next, "https://same.invalid");
    return url.origin === "https://same.invalid" ? url.pathname + url.search + url.hash : "/admin";
  } catch {
    return "/admin";
  }
}

function isLoopback(url: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(url);
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missingFields" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "invalidCredentials" };

  redirect(safeNext(formData.get("next")));
}

/**
 * Sign-in link on e-mail as the second way in — only for EXISTING admin accounts (owner, staff, platform admin);
 * registration stays off. The answer never reveals whether the account exists. Limited per IP like the guest forms.
 */
export async function sendLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z
    .email()
    .max(254)
    .safeParse(
      String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
    );
  if (!parsed.success) return { error: "invalidEmail" };
  if (await guardGuestAction(null, "staff_link", null, { captcha: false })) {
    return { error: "limit" };
  }
  const email = parsed.data;
  const admin = createAdminClient();
  // generateLink fails for unknown e-mails (it does not create accounts for magic links) — same answer then.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) return { error: null, linkSent: true };
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
  // Guests have their own code login on the client's domain; their identity must not open the admin.
  if ((memberships ?? 0) === 0 && (admins ?? 0) === 0) return { error: null, linkSent: true };

  // The link goes to the configured app address, never to the Host of the request (it could be forged).
  const h = await headers();
  const local = `http://${h.get("host") ?? "localhost:3000"}`;
  const base =
    process.env.APP_URL ||
    (process.env.NODE_ENV !== "production" || isLoopback(local) ? local : "");
  if (!base) return { error: null, linkSent: true };
  const next = safeNext(formData.get("next"));
  const href = `${base}/auth/confirm?token_hash=${encodeURIComponent(
    link.data.properties.hashed_token,
  )}&type=magiclink&next=${encodeURIComponent(next)}`;
  await sendEmail(
    renderStaffLoginLink(
      { name: platformBrand.name, accent: DEFAULT_THEME.primaryColor },
      email,
      href,
    ),
  );
  return { error: null, linkSent: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
