"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getCurrentUser } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Owner block (personal use, maintenance): no guest data, no price (ROZHODNUTIA 16. 10.). */
export async function createBlock(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({
      unit_id: z.uuid(),
      from: z.iso.date(),
      to: z.iso.date(),
      label: z
        .string()
        .trim()
        .max(80)
        .transform((v) => v || null),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.to <= parsed.data.from) return fail("invalid");
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("occupancy").insert({
    tenant_id: active.tenantId,
    unit_id: parsed.data.unit_id,
    nights: `[${parsed.data.from},${parsed.data.to})`,
    kind: "block",
    label: parsed.data.label,
    created_by: user?.id ?? null,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/blocks");
  revalidatePath("/admin/calendar");
  return ok();
}

export async function deleteBlock(id: string) {
  const supabase = await createClient();
  await supabase.from("occupancy").delete().eq("id", id).eq("kind", "block");
  revalidatePath("/admin/blocks");
  revalidatePath("/admin/calendar");
}
