"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

/** "Označiť ako vyriešené" / "Znovu otvoriť" a collision (database `resolve_conflict`: audit, bell, channel state). */
export async function resolveCollision(id: string, resolved: boolean): Promise<ActionResult> {
  await requireTenant();
  if (!z.uuid().safeParse(id).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_conflict", {
    p_occupancy_id: id,
    p_resolved: resolved,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin", "layout");
  return ok();
}
