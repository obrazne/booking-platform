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
  dated = false,
): { items: number; quantity: number; amountCents: number } {
  const pieces = Math.max(1, Math.min(Math.trunc(items) || 1, service.maxQuantity ?? 100));
  // An order for one day of the stay counts that one night (place_order, Z37).
  const quantity = modelQuantity(service.priceModel, dated ? 1 : stay.nights, stay.persons, pieces);
  return { items: pieces, quantity, amountCents: service.amountCents * quantity };
}

/**
 * How the guest picks days of a service (design v2.3): a service priced per night (breakfast, sauna) on any nights
 * of the stay — an order per day; a service the owner confirms (chef) on one evening; anything else for the stay.
 */
export type DayMode = "multi" | "single" | "none";
export function dayMode(priceModel: PriceModel, requiresConfirmation: boolean): DayMode {
  if (priceModel === "per_night" || priceModel === "per_person_night") return "multi";
  return requiresConfirmation ? "single" : "none";
}

/** Midnight of a calendar day in a time zone, as an instant. */
export function localMidnight(date: string, timeZone: string): Date {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const offset = (at: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return local - at;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}

/** When ordering closes: the given hours before the day of the service, or before arrival (as place_order). */
export function orderCutoff(day: string, cutoffHours: number, timeZone: string): Date {
  return new Date(localMidnight(day, timeZone).getTime() - cutoffHours * 3_600_000);
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
