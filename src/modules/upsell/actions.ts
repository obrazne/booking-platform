"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

/** Owner confirms an order that waits, or declines one with a reason (database: `decide_order`). */
export async function decideOrder(
  orderId: string,
  confirm: boolean,
  reason = "",
): Promise<ActionResult> {
  await requireTenant();
  if (!z.uuid().safeParse(orderId).success) return fail("invalid");
  if (!confirm && !reason.trim()) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_order", {
    p_order_id: orderId,
    p_confirm: confirm,
    p_reason: reason.trim().slice(0, 500),
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/reservations");
  return ok();
}

/** "Vyúčtovať": one payment for the open confirmed orders (database: `settle_stay_account`). */
export async function settleStayAccount(
  reservationId: string,
  provider: "on_site" | "bank_transfer",
): Promise<ActionResult> {
  await requireTenant();
  if (!z.uuid().safeParse(reservationId).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("settle_stay_account", {
    p_reservation_id: reservationId,
    p_provider: provider,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/reservations");
  return ok();
}
