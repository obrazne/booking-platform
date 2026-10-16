"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { syncDueChannels } from "@/core/ical/sync";
import { createClient } from "@/lib/supabase/server";

/** Only public https addresses: the import is fetched by our server (no internal hosts). */
function isSafeCalendarUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  )
    return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return false; // IP literals
  return true;
}

export async function addChannel(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({
      unit_id: z.uuid(),
      name: z.string().trim().min(1).max(80),
      source: z.enum(["booking", "airbnb", "other"]),
      import_url: z.string().trim().max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || !isSafeCalendarUrl(parsed.data.import_url)) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("ical_channels")
    .insert({ ...parsed.data, tenant_id: active.tenantId });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/ical");
  return ok();
}

export async function deleteChannel(id: string) {
  const supabase = await createClient();
  await supabase.from("ical_channels").delete().eq("id", id);
  revalidatePath("/admin/ical");
  revalidatePath("/admin/calendar");
}

/** Sync the tenant's channels right away (the same import as the worker). */
export async function syncNow(): Promise<ActionResult> {
  const active = await requireTenant();
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("ical_channels")
    .select("id")
    .eq("tenant_id", active.tenantId);
  if (!mine?.length) return ok();
  await syncDueChannels(
    mine.length,
    mine.map((c) => c.id),
  );
  revalidatePath("/admin/ical");
  revalidatePath("/admin/calendar");
  return ok();
}
