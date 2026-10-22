"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { sendEmail } from "@/core/email/send";
import { parseMinorUnits } from "@/core/format/format";
import { giftVoucherDocument } from "@/core/gift-vouchers/document";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .transform((v) => v || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

function refresh() {
  revalidatePath("/admin/vouchers");
}

/** "Nový poukaz" (Z78): value, on whose name, valid until, note — the code is made by the database. */
export async function createGiftVoucher(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const tenant = await getTenantInfo(active.tenantId);
  const parsed = z
    .object({
      amount: z.string().trim().min(1),
      recipient_name: optionalText(120),
      valid_until: optionalDate,
      note: optionalText(500),
    })
    .safeParse(Object.fromEntries(form));
  const cents = parsed.success ? parseMinorUnits(parsed.data.amount, tenant.currency) : null;
  if (!parsed.success || cents === null || cents <= 0) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("gift_voucher_create", {
    p_tenant_id: active.tenantId,
    p_amount_cents: cents,
    p_recipient_name: parsed.data.recipient_name ?? undefined,
    p_valid_until: parsed.data.valid_until ?? undefined,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

/** Name, valid until and the note can change; the value and the code not. */
export async function updateGiftVoucher(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({
      recipient_name: optionalText(120),
      valid_until: optionalDate,
      note: optionalText(500),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("gift_vouchers")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("tenant_id", active.tenantId)
    .eq("id", id);
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

export async function cancelGiftVoucher(id: string): Promise<ActionResult> {
  const active = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("gift_vouchers")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("tenant_id", active.tenantId)
    .eq("id", id);
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

/** "Poslať e-mailom": the voucher with the PDF to the given address. */
export async function sendGiftVoucher(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult & { email?: string }> {
  const active = await requireTenant();
  const email = z
    .email()
    .max(200)
    .safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return fail("invalid");
  const doc = await giftVoucherDocument(active.tenantId, id);
  if (!doc || doc.voucher.status !== "active") return fail("invalid");
  const r = await sendEmail(doc.email(email.data));
  return r.ok ? { ...ok(), email: email.data } : fail("generic");
}
