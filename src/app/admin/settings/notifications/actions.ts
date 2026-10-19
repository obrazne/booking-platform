"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/core/admin/action";
import { createClient } from "@/lib/supabase/server";

/** The monthly report by e-mail on the 1st of the month on / off (Z62). */
export async function setMonthlyReportEmail(on: boolean): Promise<{ ok: boolean }> {
  const active = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_settings")
    .upsert({ tenant_id: active.tenantId, monthly_report_email: Boolean(on) });
  revalidatePath("/admin/settings");
  return { ok: !error };
}
