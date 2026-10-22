"use server";

import { revalidatePath } from "next/cache";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { parseSites } from "@/core/widget/sites";
import { createClient } from "@/lib/supabase/server";

/** Websites where the widget may be embedded (Z83, Nastavenia → Prepojenia). */
export async function saveWidgetSites(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const { sites, invalid } = parseSites(String(form.get("widget_sites") ?? "").slice(0, 4000));
  if (invalid.length) return fail("widgetSites");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_settings")
    .upsert({ tenant_id: active.tenantId, widget_sites: sites }, { onConflict: "tenant_id" });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/settings");
  return ok();
}
