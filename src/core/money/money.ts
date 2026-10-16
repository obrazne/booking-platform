/**
 * Money is always an integer amount of minor units (cents) together with its ISO 4217 currency (A5).
 * Never use floating point for amounts; convert to a decimal string only for display.
 */
export type Money = Readonly<{ amount: number; currency: string }>;

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Currency mismatch: ${a} vs ${b}`);
  }
}

function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Money amount must be a safe integer of minor units, got ${amount}`);
  }
}

function assertCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError(`Invalid currency code: ${currency}`);
}

export function money(amount: number, currency: string): Money {
  assertMinorUnits(amount);
  assertCurrency(currency);
  return Object.freeze({ amount, currency });
}

export function zero(currency: string): Money {
  return money(0, currency);
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function sum(items: readonly Money[], currency: string): Money {
  return items.reduce((acc, item) => add(acc, item), zero(currency));
}

/** Multiplies by an integer quantity (nights, persons, pieces). */
export function multiply(a: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) throw new RangeError("Quantity must be an integer");
  return money(a.amount * quantity, a.currency);
}

/**
 * Percentage of an amount in basis points (1 % = 100 bp), rounded half away from zero to whole minor units.
 * Used for discounts and taxes so that no fractional cents ever exist.
 */
export function percentage(a: Money, basisPoints: number): Money {
  if (!Number.isInteger(basisPoints)) throw new RangeError("Basis points must be an integer");
  const raw = (a.amount * basisPoints) / 10_000;
  const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
  return money(rounded === 0 ? 0 : rounded, a.currency);
}

/** Splits an amount into parts by weights without losing a cent (remainder goes to the first parts). */
export function allocate(a: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0 || weights.some((w) => !Number.isInteger(w) || w < 0)) {
    throw new RangeError("Weights must be non-negative integers");
  }
  const total = weights.reduce((s, w) => s + w, 0);
  if (total === 0) throw new RangeError("Weights must not all be zero");
  const parts = weights.map((w) => Math.trunc((a.amount * w) / total));
  let remainder = a.amount - parts.reduce((s, p) => s + p, 0);
  const step = Math.sign(remainder);
  for (let i = 0; remainder !== 0; i = (i + 1) % parts.length) {
    if (weights[i] === 0) continue;
    parts[i]! += step;
    remainder -= step;
  }
  return parts.map((p) => money(p, a.currency));
}

export function isNegative(a: Money): boolean {
  return a.amount < 0;
}
