"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type GuestOrderResult = { ok: true } | { ok: false; error: GuestOrderError };

/** Reasons the database gives (place_order, cancel_order) that the guest gets explained; anything else is generic. */
const KNOWN = [
  "cutoff_passed",
  "over_limit",
  "service_unavailable",
  "not_confirmed",
  "departed",
  "stay_account_not_allowed",
  "not_cancellable",
  "not_allowed",
] as const;
export type GuestOrderError = (typeof KNOWN)[number] | "invalid" | "generic";

function failure(error: { message?: string; code?: string } | null): GuestOrderResult {
  const key = KNOWN.find((k) => error?.message?.includes(k));
  return { ok: false, error: key ?? (error?.code === "42501" ? "not_allowed" : "generic") };
}

function refresh() {
  revalidatePath("/ucet/pobyt/[id]", "page");
  revalidatePath("/r/[token]", "page");
}

const orderInput = z.object({
  reservationId: z.uuid(),
  serviceId: z.uuid(),
  dates: z.array(z.iso.date()).max(31),
  paymentMethod: z.enum(["stay_account", "transfer"]),
  token: z.string().min(10).max(200).optional(),
});

/**
 * Guest orders a service bindingly (Z37): one order per chosen day, all at once (database `place_orders` — checks
 * access through the account or the access link, the cutoff, the limit of the stay account and freezes the price).
 */
export async function orderService(input: z.input<typeof orderInput>): Promise<GuestOrderResult> {
  const parsed = orderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { reservationId, serviceId, dates, paymentMethod, token } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("place_orders", {
    p_reservation_id: reservationId,
    p_service_id: serviceId,
    p_dates: dates.length ? dates : undefined,
    p_payment_method: paymentMethod,
    p_token: token,
  });
  if (error) return failure(error);
  refresh();
  return { ok: true };
}

/** Guest cancels an order until its cutoff (database `cancel_order`). */
export async function cancelGuestOrder(orderId: string, token?: string): Promise<GuestOrderResult> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "invalid" };
  if (token !== undefined && !z.string().min(10).max(200).safeParse(token).success)
    return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_token: token });
  if (error) return failure(error);
  refresh();
  return { ok: true };
}
