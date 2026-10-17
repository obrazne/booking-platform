import type { Money } from "@/core/money/money";

function fractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** Formats integer minor units with the currency for the given locale, e.g. 12345 EUR → "123,45 €" (sk). */
export function formatMoney(value: Money, locale: string): string {
  const digits = fractionDigits(value.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value.amount / 10 ** digits);
}

/** Parses a user-entered decimal string ("123,45" or "123.45") into integer minor units without floats. */
export function parseMinorUnits(input: string, currency: string): number | null {
  const digits = fractionDigits(currency);
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;
  const [, sign, whole, frac = ""] = match;
  if (frac.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number(frac.padEnd(digits, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return sign ? -minor : minor;
}

export type DateStyle = "short" | "medium" | "long";

/** Calendar date (YYYY-MM-DD, no time) formatted for the locale — stays the same day in every timezone. */
export function formatDate(
  isoDate: string,
  locale: string,
  style: DateStyle | "dayMonth" = "medium",
): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  // "dayMonth": day and month without the year (week labels in the occupancy overview).
  const options: Intl.DateTimeFormatOptions =
    style === "dayMonth"
      ? { day: "numeric", month: "numeric", timeZone: "UTC" }
      : { dateStyle: style, timeZone: "UTC" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Point in time formatted in the tenant's timezone. */
export function formatDateTime(
  value: string | Date,
  locale: string,
  timeZone: string,
  style: DateStyle = "medium",
): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeStyle: "short", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}
