"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getCurrentUser } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const code = (len: number, upper: boolean) =>
  z
    .string()
    .trim()
    .transform((v) => (upper ? v.toUpperCase() : v.toLowerCase()) || null)
    .refine((v) => v === null || new RegExp(`^[a-zA-Z]{${len}}$`).test(v));

const contact = {
  name: text(120),
  phone: text(40),
  country: code(2, true),
  language: code(2, false),
  address: text(300),
};

/** "+ Pridať hosťa" (Z68): by hand, without a consent (the database does not let the team write it). */
export async function createGuest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({ ...contact, email: z.email().transform((v) => v.trim().toLowerCase()) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("guests")
    .insert({ tenant_id: active.tenantId, source: "manual", ...parsed.data });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/guests");
  return ok();
}

/** The owner edits the contact; who filled in the address and when is set by the database. */
export async function updateGuest(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireTenant();
  const parsed = z.object({ id: z.uuid(), ...contact }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("guests").update(values).eq("id", id);
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/guests");
  return ok();
}

/** The team's note about a guest (the guest never reads it). Empty = removed. */
export async function saveGuestNote(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({ id: z.uuid(), body: z.string().trim().max(2000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { error } = parsed.data.body
    ? await supabase.from("guest_notes").upsert({
        guest_id: parsed.data.id,
        tenant_id: active.tenantId,
        body: parsed.data.body,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
    : await supabase.from("guest_notes").delete().eq("guest_id", parsed.data.id);
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/guests");
  return ok();
}

/** The owner revokes the consent in the guest's name, with the reason (written with who did it). */
export async function revokeConsent(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireTenant();
  const parsed = z
    .object({ id: z.uuid(), reason: z.string().trim().min(1).max(300) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("guest_consent_revoke", {
    p_guest_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/guests");
  return ok();
}

/** "Poslať žiadosť o súhlas" — the rules (12 months, not after a revocation) are in the database. */
export async function requestConsent(id: string): Promise<ActionResult> {
  await requireTenant();
  if (!z.uuid().safeParse(id).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("guest_consent_request", { p_guest_id: id });
  if (error) return fail(error.code === "P0001" ? `consent_${error.message}` : dbErrorKey(error));
  revalidatePath("/admin/guests");
  return ok();
}
