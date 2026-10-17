/**
 * Owner statistics (Z27, vizuál administrácie v1.2) — pure helpers over the monthly rows of `tenant_monthly_stats`.
 * The database does the money and night arithmetic; here only sums, year-on-year changes and the chart geometry.
 */

export type MonthStat = {
  /** First day of the month, ISO date. */
  month: string;
  revenueCents: number;
  /** Part of revenueCents for nights that have not happened yet. */
  futureCents: number;
  nightsSold: number;
  reservations: number;
  occupiedNights: number;
  availableNights: number;
};

export type StatsPeriod = { kind: "year"; year: number } | { kind: "12m" };

/** Months of the period as [first, last] month starts; "12m" = the 12 months ending with the current one. */
export function periodMonths(period: StatsPeriod, today: string): { from: string; to: string } {
  if (period.kind === "year") return { from: `${period.year}-01-01`, to: `${period.year}-12-01` };
  const to = `${today.slice(0, 7)}-01`;
  return { from: shiftMonths(to, -11), to };
}

/** Month start moved by n months. */
export function shiftMonths(month: string, n: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
}

export type StatsTotals = {
  revenueCents: number;
  reservations: number;
  nightsSold: number;
  /** Occupied / available nights, 0–100 (one decimal), null without available nights. */
  occupancy: number | null;
  /** Revenue per sold night, null without nights. */
  avgNightCents: number | null;
};

export function totals(rows: readonly MonthStat[]): StatsTotals {
  const sum = (f: (r: MonthStat) => number) => rows.reduce((s, r) => s + f(r), 0);
  const revenueCents = sum((r) => r.revenueCents);
  const nightsSold = sum((r) => r.nightsSold);
  const available = sum((r) => r.availableNights);
  return {
    revenueCents,
    reservations: sum((r) => r.reservations),
    nightsSold,
    occupancy: available
      ? Math.round((sum((r) => r.occupiedNights) / available) * 1000) / 10
      : null,
    avgNightCents: nightsSold ? Math.round(revenueCents / nightsSold) : null,
  };
}

export function monthOccupancy(r: MonthStat): number | null {
  return r.availableNights ? Math.round((r.occupiedNights / r.availableNights) * 100) : null;
}

export type Change = { direction: "up" | "down"; value: number; unit: "%" | "pp" } | null;

/** Year-on-year change: per cent for amounts and counts, percentage points for occupancy. */
export function change(current: number | null, previous: number | null, unit: "%" | "pp"): Change {
  if (current == null || previous == null) return null;
  if (unit === "%") {
    if (!previous) return null;
    const d = Math.round(((current - previous) / previous) * 100);
    return { direction: d >= 0 ? "up" : "down", value: Math.abs(d), unit };
  }
  const d = Math.round(current - previous);
  return { direction: d >= 0 ? "up" : "down", value: Math.abs(d), unit };
}

/** Index of the month that has started (its first day is not after today); -1 when the period is all in the future. */
export function lastStartedIndex(rows: readonly MonthStat[], today: string): number {
  let i = -1;
  rows.forEach((r, k) => {
    if (r.month <= today) i = k;
  });
  return i;
}

/** Strongest month (any) and weakest month (only months that have started) — null when there is no revenue. */
export function extremes(
  rows: readonly MonthStat[],
  today: string,
): { strongest: number | null; weakest: number | null } {
  if (!rows.some((r) => r.revenueCents > 0)) return { strongest: null, weakest: null };
  let strongest = 0;
  rows.forEach((r, i) => {
    if (r.revenueCents > rows[strongest]!.revenueCents) strongest = i;
  });
  const done = lastStartedIndex(rows, today);
  let weakest: number | null = null;
  for (let i = 0; i <= done; i++) {
    if (i === strongest) continue;
    if (weakest == null || rows[i]!.revenueCents < rows[weakest]!.revenueCents) weakest = i;
  }
  return { strongest, weakest };
}

/** Rounded top of the value axis (1–2–5 steps) so the grid has round labels. */
export function axisTop(maxCents: number): number {
  if (maxCents <= 0) return 100_000;
  const magnitude = 10 ** Math.floor(Math.log10(maxCents));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (maxCents <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export type ChartBox = { x0: number; x1: number; y0: number; y1: number };

/** SVG path through the values from index `from` to `to` (inclusive). */
export function linePath(
  values: readonly number[],
  from: number,
  to: number,
  top: number,
  box: ChartBox,
): string {
  if (from > to || !values.length) return "";
  const n = Math.max(values.length - 1, 1);
  const px = (i: number) => box.x0 + ((box.x1 - box.x0) * i) / n;
  const py = (v: number) => box.y0 - ((box.y0 - box.y1) * v) / top;
  let d = "";
  for (let i = from; i <= to; i++) {
    d += `${i === from ? "M" : " L"}${px(i).toFixed(1)} ${py(values[i]!).toFixed(1)}`;
  }
  return d;
}
