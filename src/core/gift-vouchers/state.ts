/**
 * Darčekové poukazy (Z78): a value the guest pays with (a payment `gift_voucher`), not a discount — promo codes stay
 * apart. Pure helpers for the administration, the cart and the PDF.
 */

export type GiftVoucherState = "valid" | "partial" | "used" | "expired" | "cancelled";

export const GIFT_VOUCHER_STATES: readonly GiftVoucherState[] = [
  "valid",
  "partial",
  "used",
  "expired",
  "cancelled",
];

/** The state as the owner sees it: cancelled, used up, expired, partly used or valid. */
export function giftVoucherState(
  v: { status: string; amount_cents: number; balance_cents: number; valid_until: string | null },
  today: string,
): GiftVoucherState {
  if (v.status === "cancelled") return "cancelled";
  if (v.balance_cents <= 0) return "used";
  if (v.valid_until && v.valid_until < today) return "expired";
  return v.balance_cents < v.amount_cents ? "partial" : "valid";
}

/** What the voucher pays of a reservation: up to the price, the rest stays on the voucher. */
export function giftDeduction(balanceCents: number, totalCents: number): number {
  return Math.max(0, Math.min(balanceCents, totalCents));
}

/** "stromy 7k4p 2qxa" → "STROMY-7K4P-2QXA"; null when it cannot be a code (checked before any lookup). */
export function normalizeGiftCode(input: string): string | null {
  const s = input
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  const m = /^([A-Z0-9]{1,8})-?([A-Z0-9]{4})-?([A-Z0-9]{4})$/.exec(s.replace(/^-|-$/g, ""));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
