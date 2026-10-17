/**
 * Storno bands of a client (after Z44): cancelled at least `days` before arrival → `refundPct` % of the price back;
 * closer to arrival than every band → nothing back. The bands must match the client's cancellation policy (its
 * legal text) — the client sets them, the app only calculates.
 */
export type CancellationBand = { days: number; refundPct: number };

/** Bands from the database (`tenant_settings.cancellation_bands`), valid ones only, the earliest first. */
export function parseBands(value: unknown): CancellationBand[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((b) => {
      const days = Number((b as { days?: unknown })?.days);
      const pct = Number((b as { refund_pct?: unknown })?.refund_pct);
      return Number.isInteger(days) &&
        days >= 0 &&
        days <= 365 &&
        Number.isInteger(pct) &&
        pct >= 0 &&
        pct <= 100
        ? [{ days, refundPct: pct }]
        : [];
    })
    .sort((a, b) => b.days - a.days);
}

/** Bands for the database. */
export function bandsToJson(bands: CancellationBand[]) {
  return [...bands]
    .sort((a, b) => b.days - a.days)
    .map((b) => ({ days: b.days, refund_pct: b.refundPct }));
}

/**
 * What a cancellation `daysLeft` days before arrival means: the fee is the part of the price not returned, the refund
 * is what was paid above the fee. Null when the client has no bands (the owner decides by the wording).
 */
export function cancellationOutcome(
  bands: CancellationBand[],
  daysLeft: number,
  totalCents: number,
  paidCents: number,
): { refundPct: number; feeCents: number; refundCents: number } | null {
  if (!bands.length) return null;
  const band = bands.find((b) => daysLeft >= b.days);
  const refundPct = band?.refundPct ?? 0;
  const feeCents = Math.round((totalCents * (100 - refundPct)) / 100);
  return { refundPct, feeCents, refundCents: Math.max(0, paidCents - feeCents) };
}
