"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { parseMinorUnits } from "@/core/format/format";
import { localizedFromForm } from "@/core/i18n/localized";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

export async function saveService(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  if (!(await isModuleEnabled(active.tenantId, "services"))) return fail("forbidden");
  const tenant = await getTenantInfo(active.tenantId);
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      property_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
      price_model: z.enum(["per_stay", "per_night", "per_person", "per_person_night", "per_item"]),
      amount: z.string(),
      max_quantity: z
        .string()
        .transform((v) => (v.trim() === "" ? null : Number(v)))
        .pipe(z.number().int().min(1).max(100).nullable()),
      active: z.preprocess((v) => v === "on", z.boolean()),
    })
    .safeParse({ ...Object.fromEntries(form), active: form.get("active") });
  const name = localizedFromForm(form, "name", tenant.locales);
  if (!parsed.success || Object.keys(name).length === 0) return fail("invalid");
  const { id, amount, ...v } = parsed.data;
  const cents = parseMinorUnits(amount, tenant.currency);
  if (cents === null || cents < 0) return fail("invalid");
  // Settings for ordering after the reservation (module upsell) — only when the form had them.
  const upsell =
    form.get("upsell") === "1" && (await isModuleEnabled(active.tenantId, "upsell"))
      ? z
          .object({
            upsell_cutoff_hours: z.coerce.number().int().min(0).max(720),
          })
          .safeParse(Object.fromEntries(form))
      : null;
  if (upsell && !upsell.success) return fail("invalid");
  const row = {
    ...v,
    ...(upsell?.success
      ? {
          upsell_enabled: form.get("upsell_enabled") === "on",
          upsell_cutoff_hours: upsell.data.upsell_cutoff_hours,
          upsell_requires_confirmation: form.get("upsell_requires_confirmation") === "on",
          upsell_stay_account: form.get("upsell_stay_account") === "on",
        }
      : {}),
    name,
    description: localizedFromForm(form, "description", tenant.locales),
    amount_cents: cents,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert({ ...row, tenant_id: tenant.id });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/services");
  return ok();
}

export async function deleteService(id: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/admin/services");
}
