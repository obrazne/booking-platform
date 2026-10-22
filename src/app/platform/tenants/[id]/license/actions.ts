"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { isPlatformAdmin } from "@/core/auth/session";
import { parseMinorUnits } from "@/core/format/format";
import { LICENSE_PACKAGES, LICENSE_STATES } from "@/core/licenses/basis";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const money = z
  .string()
  .trim()
  .transform((v) => parseMinorUnits(v || "0", "EUR"))
  .refine((v): v is number => v !== null && v >= 0);

/** Riadiace centrum › Licencia (Z81): the record of the contract; the change and the state go to the audit. */
export async function saveLicense(
  tenantId: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!(await isPlatformAdmin()) || !z.uuid().safeParse(tenantId).success) return fail("forbidden");
  const parsed = z
    .object({
      number: z.string().trim().min(1).max(40),
      package: z.enum(LICENSE_PACKAGES as [string, ...string[]]),
      setup_fee: money,
      monthly_fee: money,
      percent: z
        .string()
        .trim()
        .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
        .refine((v) => Number.isInteger(v) && v >= 0 && v <= 10000),
      starts_on: z.iso.date(),
      contract_until: z.union([z.iso.date(), z.literal("")]).optional(),
      state: z.enum(LICENSE_STATES as [string, ...string[]]),
      note: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  const v = parsed.data;
  const ids = (key: string) =>
    form
      .getAll(key)
      .map(String)
      .filter((x) => z.uuid().safeParse(x).success);
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_save_license", {
    p_tenant_id: tenantId,
    p: {
      number: v.number,
      package: v.package,
      modules: form
        .getAll("modules")
        .map(String)
        .filter((m) => /^[a-z_]{1,40}$/.test(m)),
      property_ids: ids("property_ids"),
      setup_fee_cents: v.setup_fee,
      monthly_fee_cents: v.monthly_fee,
      turnover_bp: v.percent,
      starts_on: v.starts_on,
      contract_until: v.contract_until || null,
      state: v.state,
      note: v.note ?? "",
    } as unknown as Json,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath(`/platform/tenants/${tenantId}/license`);
  revalidatePath("/platform");
  return ok();
}
