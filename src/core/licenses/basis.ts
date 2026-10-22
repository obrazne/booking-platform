/**
 * Licencie klientov (Z81, A10): the monthly basis of Martin's invoice to a client — the monthly fee of the package, the
 * percentage of the turnover of the month and, in the first month, the setup. Pure (amounts in cents, + VAT later).
 */

export type LicensePackage = "basic" | "carefree";
export type LicenseState = "active" | "overdue" | "suspended";

export const LICENSE_PACKAGES: readonly LicensePackage[] = ["basic", "carefree"];
export const LICENSE_STATES: readonly LicenseState[] = ["active", "overdue", "suspended"];

/** A10: 150 € Základ, 190 € Bez starostí; setup 990 €; 2 % of the direct turnover. */
export const LICENSE_DEFAULTS = {
  setupFeeCents: 99000,
  monthlyFeeCents: { basic: 15000, carefree: 19000 } as Record<LicensePackage, number>,
  turnoverBp: 200,
};

/** Module trial (A10): 30 days — in a chalet there is often no guest in a week. */
export const MODULE_TRIAL_DAYS = 30;

export type LicenseForBasis = {
  number: string;
  package: LicensePackage;
  setup_fee_cents: number;
  monthly_fee_cents: number;
  turnover_bp: number;
  starts_on: string;
};

export type Turnover = {
  month: string;
  stays_cents: number;
  orders_cents: number;
  kept_cents: number;
  total_cents: number;
};

export type BasisLine = { key: "setup" | "monthly" | "turnover"; amountCents: number };

/** The lines of the basis of one month; nothing before the licence starts. */
export function licenseMonthBasis(l: LicenseForBasis, t: Turnover) {
  const month = t.month.slice(0, 7);
  const started = l.starts_on.slice(0, 7);
  if (month < started) return { lines: [] as BasisLine[], totalCents: 0, percentCents: 0 };
  const percentCents = Math.round((t.total_cents * l.turnover_bp) / 10000);
  const lines: BasisLine[] = [
    ...(month === started && l.setup_fee_cents > 0
      ? [{ key: "setup" as const, amountCents: l.setup_fee_cents }]
      : []),
    { key: "monthly", amountCents: l.monthly_fee_cents },
    { key: "turnover", amountCents: percentCents },
  ];
  return { lines, totalCents: lines.reduce((s, x) => s + x.amountCents, 0), percentCents };
}
