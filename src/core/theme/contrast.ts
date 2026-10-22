/** WCAG 2.x contrast helpers for automatic text colour and theme validation (A12). */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new RangeError(`Invalid hex colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const DARK_TEXT = "#111111";
export const LIGHT_TEXT = "#ffffff";

/** Text colour (near-black or white) with the better contrast on the given background. */
export function readableTextOn(background: string): string {
  return contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT)
    ? DARK_TEXT
    : LIGHT_TEXT;
}

/** WCAG AA: 4.5 for normal text, 3 for large text and UI components. */
export function meetsAA(foreground: string, background: string, large = false): boolean {
  return contrastRatio(foreground, background) >= (large ? 3 : 4.5);
}

/**
 * Darkens a colour step by step until white text on it reaches 7 : 1 (coloured surfaces with white text, A12 v2) —
 * so the lighter tints of secondary text on it (text-on-accent-*) still meet AA (Z41: the demo client's blue failed).
 */
export function surfaceForWhiteText(hex: string): string {
  let { r, g, b } = parseHex(hex);
  const toHex = () =>
    `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  for (let i = 0; i < 40 && contrastRatio(toHex(), LIGHT_TEXT) < 7; i++) {
    r *= 0.92;
    g *= 0.92;
    b *= 0.92;
  }
  return toHex();
}

/**
 * Focus ring of a client's theme (Z54, rule 1): the accent itself when it has 3 : 1 against white fields and cards,
 * otherwise darkened step by step until it does — a light accent (yellow, mint) would leave the focus invisible.
 */
export function focusRingFor(hex: string): string {
  let { r, g, b } = parseHex(hex);
  const toHex = () =>
    `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  for (let i = 0; i < 40 && contrastRatio(toHex(), "#fafaf8") < 3; i++) {
    r *= 0.92;
    g *= 0.92;
    b *= 0.92;
  }
  return toHex();
}

/**
 * The accent as text on white (links, highlighted words): the accent itself when it reaches 4.5 : 1, otherwise darkened
 * step by step — a light accent such as gold (Chalet STRÖMY, #c7b56a, 2 : 1) stays for buttons with dark text only.
 */
export function textAccentFor(hex: string): string {
  let { r, g, b } = parseHex(hex);
  const toHex = () =>
    `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  for (let i = 0; i < 40 && contrastRatio(toHex(), "#fafaf8") < 4.5; i++) {
    r *= 0.92;
    g *= 0.92;
    b *= 0.92;
  }
  return toHex();
}
