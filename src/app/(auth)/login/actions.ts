"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: "invalidCredentials" | "missingFields" | null };

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

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missingFields" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "invalidCredentials" };

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
