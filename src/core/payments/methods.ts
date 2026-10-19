/**
 * Ways a guest pays a reservation (Z69, vizuál administrácie v1.7). Each provider says whether it is built and whether a
 * client can use it; the cart offers only methods that are switched on **and** ready. Adding card payments (Stripe) means
 * implementing its provider here and the connection flow — the settings, the data and the cart already know the method.
 * Matches `payments.provider` in the database (bank_transfer | card | on_site).
 */
export type PaymentMethodKey = "bank_transfer" | "card";

export type PaymentSettings = {
  bank_transfer_enabled?: boolean | null;
  card_enabled?: boolean | null;
  stripe_account_id?: string | null;
  iban?: string | null;
};

export type PaymentProvider = {
  key: PaymentMethodKey;
  /** The code to take the payment exists. */
  built: boolean;
  /** Switched on by the client. */
  enabled: (s: PaymentSettings) => boolean;
  /** Everything the method needs is filled in (account, connected provider). */
  configured: (s: PaymentSettings) => boolean;
};

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] = [
  {
    key: "bank_transfer",
    built: true,
    enabled: (s) => s.bank_transfer_enabled ?? true,
    configured: (s) => Boolean(s.iban),
  },
  {
    // Prepared, not built (Z69): Stripe Checkout / Payment Element with a connected account comes later.
    key: "card",
    built: false,
    enabled: (s) => s.card_enabled ?? false,
    configured: (s) => Boolean(s.stripe_account_id),
  },
];

/** Methods the cart offers: on, built and configured — in this order. */
export function offeredMethods(s: PaymentSettings): PaymentMethodKey[] {
  return PAYMENT_PROVIDERS.filter((p) => p.built && p.enabled(s) && p.configured(s)).map(
    (p) => p.key,
  );
}

/** The rule of the database: at least one way to pay a reservation stays on. */
export function keepsOneMethod(s: PaymentSettings): boolean {
  return PAYMENT_PROVIDERS.some((p) => p.enabled(s));
}
