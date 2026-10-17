"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { parseMinorUnits } from "@/core/format/format";
import { localizedFromForm } from "@/core/i18n/localized";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

export async function saveSettings(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const tenant = await getTenantInfo(active.tenantId);
  const parsed = z
    .object({
      iban: z
        .string()
        .transform((v) => v.replace(/\s/g, "").toUpperCase())
        .pipe(z.string().regex(/^([A-Z]{2}\d{2}[A-Z0-9]{10,30})?$/))
        .transform((v) => v || null),
      account_holder: text(140),
      bic: text(11),
      payment_due_hours: z.coerce.number().int().min(1).max(336),
      hold_minutes: z.coerce.number().int().min(5).max(240),
      terms_url: z.union([z.url(), z.literal("")]).transform((v) => v || null),
      privacy_url: z.union([z.url(), z.literal("")]).transform((v) => v || null),
      reviews_url: z
        .union([z.url().startsWith("https://"), z.literal("")])
        .transform((v) => v || null),
      owner_notification_email: z.union([z.email(), z.literal("")]).transform((v) => v || null),
      arrival_email_days_before: z.coerce.number().int().min(0).max(30),
      vat_payer: z.preprocess((v) => v === "on", z.boolean()),
      // Percent in the form, basis points in the database.
      portal_commission_bp: z.coerce
        .number()
        .min(0)
        .max(50)
        .transform((v) => Math.round(v * 100)),
      // Module upsell: whole units in the form, cents in the database; absent when the module is off.
      stay_account_limit: z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .optional()
        .transform((v) => (v === undefined ? undefined : v * 100)),
      // Module upsell: days before arrival with an offer e-mail, "7, 2" in the form (Z37).
      upsell_offer_days: z
        .string()
        .max(20)
        .optional()
        .transform((v, ctx) => {
          if (v === undefined) return undefined;
          const days = [
            ...new Set(
              v
                .split(/[\s,;]+/)
                .filter(Boolean)
                .map(Number),
            ),
          ];
          if (days.length > 3 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 30)) {
            ctx.addIssue({ code: "custom", message: "days" });
            return z.NEVER;
          }
          return days.sort((a, b) => b - a);
        }),
    })
    .safeParse({ ...Object.fromEntries(form), vat_payer: form.get("vat_payer") });
  if (!parsed.success) return fail("invalid");
  const { stay_account_limit, upsell_offer_days, ...settings } = parsed.data;
  // Module checkin: tax for accommodation and retention — only when the form had them.
  let checkin = {};
  if (form.has("checkin_retention_days")) {
    const c = z
      .object({
        city_tax_municipality: text(120),
        city_tax_exempt_under: z.coerce.number().int().min(0).max(120),
        checkin_retention_days: z.coerce.number().int().min(30).max(3650),
      })
      .safeParse(Object.fromEntries(form));
    const cents = parseMinorUnits(String(form.get("city_tax") ?? "0") || "0", tenant.currency);
    if (!c.success || cents === null || cents < 0) return fail("invalid");
    checkin = { ...c.data, city_tax_cents: cents };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_settings").upsert({
    tenant_id: tenant.id,
    ...settings,
    ...checkin,
    ...(stay_account_limit === undefined ? {} : { stay_account_limit_cents: stay_account_limit }),
    ...(upsell_offer_days === undefined ? {} : { upsell_offer_days }),
    cancellation_policy: localizedFromForm(form, "cancellation_policy", tenant.locales),
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/settings");
  return ok();
}
