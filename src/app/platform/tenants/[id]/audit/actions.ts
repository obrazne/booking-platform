"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

export type RevertResult = {
  status:
    "ok" | "changed" | "gone" | "exists" | "conflict" | "missing_parent" | "invalid" | "error";
  current?: Record<string, unknown>;
};

/**
 * "Vrátiť túto zmenu" (Z31): the database reverts one change and writes it to the history and the audit. Without
 * `force` a record that changed again since is left alone and its current state comes back.
 */
export async function revertChange(historyId: number, force = false): Promise<RevertResult> {
  if (!Number.isInteger(historyId) || historyId <= 0 || !(await isPlatformAdmin())) {
    return { status: "error" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_revert_change", {
    p_history_id: historyId,
    p_force: force,
  });
  if (error || !data) return { status: "error" };
  const result = data as RevertResult;
  if (result.status === "ok") revalidatePath("/platform", "layout");
  return result;
}
