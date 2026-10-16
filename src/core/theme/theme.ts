import { contrastRatio, isHexColor, readableTextOn } from "./contrast";

/** Fonts a client can choose from (A12: limited set so the look cannot be broken). */
export const FONT_KEYS = ["geist", "inter", "manrope", "lora", "playfair", "roboto"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const COLOR_MODES = ["light", "dark", "system"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export type Theme = {
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  headingFont: FontKey;
  bodyFont: FontKey;
  /** Corner radius in pixels (0–24). */
  radius: number;
  colorMode: ColorMode;
};

/**
 * Platform default for booking pages — approved guest visual (docs/vizual-stranka-hosta.md): Roboto, one spruce-green
 * accent, white surfaces, thin warm lines, generous rounding (A12).
 */
export const DEFAULT_THEME: Theme = {
  logoPath: null,
  primaryColor: "#2f5d50",
  secondaryColor: "#6e6e73",
  backgroundColor: "#ffffff",
  headingFont: "roboto",
  bodyFont: "roboto",
  radius: 16,
  colorMode: "light",
};

export type ThemeIssue =
  | { code: "invalidColor"; field: "primaryColor" | "secondaryColor" | "backgroundColor" }
  | { code: "lowContrast"; field: "primaryColor"; ratio: number }
  | { code: "invalidRadius" };

/** Validates a theme; low contrast of the accent against the background is reported, not silently fixed. */
export function validateTheme(theme: Theme): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  for (const field of ["primaryColor", "secondaryColor", "backgroundColor"] as const) {
    if (!isHexColor(theme[field])) issues.push({ code: "invalidColor", field });
  }
  if (!Number.isInteger(theme.radius) || theme.radius < 0 || theme.radius > 24) {
    issues.push({ code: "invalidRadius" });
  }
  if (issues.length === 0) {
    const ratio = contrastRatio(theme.primaryColor, theme.backgroundColor);
    if (ratio < 3) issues.push({ code: "lowContrast", field: "primaryColor", ratio });
  }
  return issues;
}

/** CSS custom properties for the tenant; text colours are derived so buttons stay readable. */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  return {
    "--primary": theme.primaryColor,
    "--primary-foreground": readableTextOn(theme.primaryColor),
    "--ring": theme.primaryColor,
    "--sidebar-primary": theme.primaryColor,
    "--sidebar-primary-foreground": readableTextOn(theme.primaryColor),
    "--brand-secondary": theme.secondaryColor,
    "--brand-secondary-foreground": readableTextOn(theme.secondaryColor),
    "--brand-background": theme.backgroundColor,
    "--radius": `${theme.radius / 16}rem`,
    "--app-font-sans": `var(--font-${theme.bodyFont})`,
    "--app-font-heading": `var(--font-${theme.headingFont})`,
  };
}

export function cssVariablesToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}
