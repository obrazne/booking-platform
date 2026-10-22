/**
 * Ways a guest pays a reservation (Z69, vizuál administrácie v1.7). Each provider says whether it is built and whether a
 * client can use it; the cart offers only methods that are switched on **and** ready. Adding card payments (Stripe) means
 * implementing its provider here and the connection flow — the settings, the data and the cart already know the method.
 * Matches `payments.provider` in the database (bank_transfer | card | on_site | recreation_voucher).
 * Z77: how each one works on a property "na schválenie" (`approval`) — card needs blocking and capturing the amount.
 */
export type PaymentMethodKey = "bank_transfer" | "card" | "recreation_voucher";

export type PaymentSettings = {
  bank_transfer_enabled?: boolean | null;
  card_enabled?: boolean | null;
  stripe_account_id?: string | null;
  iban?: string | null;
  voucher_enabled?: boolean | null;
};

export type PaymentProvider = {
  key: PaymentMethodKey;
  /** The code to take the payment exists. */
  built: boolean;
  /** Switched on by the client. */
  enabled: (s: PaymentSettings) => boolean;
  /** Everything the method needs is filled in (account, connected provider). */
  configured: (s: PaymentSettings) => boolean;
  /**
   * Z77 — on a reservation the owner approves within 48 h: `pay_after` = the payment details come after the approval
   * (transfer); `hold` = the amount is blocked now, captured at the approval and released when declined or expired
   * (card; Stripe manual capture — a block lasts ~5–7 days, enough for 48 h); `always` = the method itself always
   * goes on approval (recreation voucher).
   */
  approval: "pay_after" | "hold" | "always";
  /** For `hold`: blocking and capturing exist. Until then the method is not offered on approval. */
  holdBuilt?: boolean;
  /** Can be the only way to pay of a client (a voucher alone cannot — the rest is paid by transfer). */
  standalone: boolean;
};

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] = [
  {
    key: "bank_transfer",
    built: true,
    enabled: (s) => s.bank_transfer_enabled ?? true,
    configured: (s) => Boolean(s.iban),
    approval: "pay_after",
    standalone: true,
  },
  {
    // Prepared, not built (Z69): Stripe Checkout / Payment Element with a connected account comes later.
    key: "card",
    built: false,
    enabled: (s) => s.card_enabled ?? false,
    configured: (s) => Boolean(s.stripe_account_id),
    // Z77: block on the request, capture at the approval — comes with Stripe (holdBuilt).
    approval: "hold",
    holdBuilt: false,
    standalone: true,
  },
  {
    // Z77: the guest gives the number and the issuer; the owner fills the company and the amount at the approval,
    // the rest is paid by transfer (so the IBAN is needed).
    key: "recreation_voucher",
    built: true,
    enabled: (s) => s.voucher_enabled ?? false,
    configured: (s) => Boolean(s.iban),
    approval: "always",
    standalone: false,
  },
];

/** Methods the cart offers: on, built and configured — in this order. */
export function offeredMethods(s: PaymentSettings): PaymentMethodKey[] {
  return PAYMENT_PROVIDERS.filter((p) => p.built && p.enabled(s) && p.configured(s)).map(
    (p) => p.key,
  );
}

/** Z77: the ways offered on a property where the owner approves — card only once blocking and capturing exist. */
export function approvalMethods(methods: PaymentMethodKey[]): PaymentMethodKey[] {
  return methods.filter((m) => {
    const p = PAYMENT_PROVIDERS.find((x) => x.key === m);
    return p && (p.approval !== "hold" || p.holdBuilt === true);
  });
}

/** Z77: the ways of a property — all offered, or only those that work with the approval. */
export function propertyMethods(
  methods: PaymentMethodKey[],
  approval: boolean,
): PaymentMethodKey[] {
  return approval ? approvalMethods(methods) : methods;
}

/**
 * Prepared ways to pay the cart shows as "Pripravujeme" (inactive) — only on staging (ROZHODNUTIA 2026-10-20, Z71):
 * real guests never see an option they cannot use. Staging = e-mails redirected to one inbox (`EMAIL_REDIRECT_TO`);
 * production runs without it (ROADMAP › Pred spustením), so the inactive card disappears there by itself.
 */
export function upcomingMethods(
  s: PaymentSettings,
  env: Record<string, string | undefined> = process.env,
): PaymentMethodKey[] {
  if (!env.EMAIL_REDIRECT_TO) return [];
  const offered = offeredMethods(s);
  return PAYMENT_PROVIDERS.filter((p) => !p.built && !offered.includes(p.key)).map((p) => p.key);
}

/** The rule of the database: at least one way to pay a reservation stays on. */
export function keepsOneMethod(s: PaymentSettings): boolean {
  return PAYMENT_PROVIDERS.some((p) => p.standalone && p.enabled(s));
}
