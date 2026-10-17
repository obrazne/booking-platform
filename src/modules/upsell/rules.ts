import { modelQuantity } from "@/core/pricing/calculate";
import type { PriceModel } from "@/core/pricing/types";

/** States of an order (B11); the first three count on the stay account. */
export const ORDER_STATUSES = [
  "ordered",
  "awaiting_confirmation",
  "confirmed",
  "declined",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_METHODS = ["stay_account", "transfer", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function counts(status: string): boolean {
  return status === "ordered" || status === "awaiting_confirmation" || status === "confirmed";
}

/**
 * Price of an order — the same rule as the cart (modelQuantity) and as `place_order` in the database: pieces are
 * limited by the service's maximum, the quantity follows the price model.
 */
export function orderPrice(
  service: { priceModel: PriceModel; amountCents: number; maxQuantity: number | null },
  stay: { nights: number; persons: number },
  items: number,
): { items: number; quantity: number; amountCents: number } {
  const pieces = Math.max(1, Math.min(Math.trunc(items) || 1, service.maxQuantity ?? 100));
  const quantity = modelQuantity(service.priceModel, stay.nights, stay.persons, pieces);
  return { items: pieces, quantity, amountCents: service.amountCents * quantity };
}

/** Whether a new order paid "na účet pobytu" still fits the client's limit. */
export function fitsStayAccount(
  openOnAccountCents: number,
  amountCents: number,
  limitCents: number,
) {
  return openOnAccountCents + amountCents <= limitCents;
}

/** The guest may cancel until the cutoff and only while nothing was paid. */
export function guestCanCancel(
  order: { status: string; paidAt: string | null; cutoffAt: string },
  now: Date,
): boolean {
  return counts(order.status) && !order.paidAt && now.getTime() <= Date.parse(order.cutoffAt);
}

/** Sums of the stay account (what the database function `stay_account` returns). */
export function stayAccount(
  orders: { status: string; amountCents: number; paidAt: string | null }[],
): { total: number; paid: number; open: number } {
  let total = 0;
  let paid = 0;
  for (const o of orders) {
    if (counts(o.status)) total += o.amountCents;
    if (o.paidAt) paid += o.amountCents;
  }
  return { total, paid, open: total - paid };
}
