"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/core/admin/action";
import { createClient } from "@/lib/supabase/server";

export type RestoreResult =
  "ok" | "conflict" | "missing_parent" | "exists" | "expired" | "invalid" | "error";

/** Restores a deleted record (with the rows that went with it) from the trash — owner only, checked in the database. */
export async function restoreFromTrash(historyId: number): Promise<RestoreResult> {
  if (!Number.isInteger(historyId) || historyId <= 0) return "error";
  await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_restore", { p_history_id: historyId });
  if (error) return "error";
  if (data === "ok") revalidatePath("/admin", "layout");
  return (data as RestoreResult) ?? "error";
}
