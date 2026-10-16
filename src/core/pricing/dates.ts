/** Calendar-date helpers on YYYY-MM-DD strings (no timezones involved — a night is a calendar date). */

export type IsoDate = string;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** Nights of a stay: check-in date up to the day before check-out. */
export function nightsOf(checkIn: IsoDate, checkOut: IsoDate): IsoDate[] {
  const n = diffDays(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: IsoDate): number {
  const d = new Date(toUtc(date)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Month-day as a sortable number, e.g. 12-24 → 1224. */
export function monthDay(date: IsoDate): number {
  return Number(date.slice(5, 7)) * 100 + Number(date.slice(8, 10));
}

export function todayIso(timeZone = "Europe/Bratislava"): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}
