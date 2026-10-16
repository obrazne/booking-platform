import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  COLOR_MODES,
  DEFAULT_THEME,
  FONT_KEYS,
  type ColorMode,
  type FontKey,
  type Theme,
} from "./theme";

type ThemeRow = Database["public"]["Tables"]["tenant_themes"]["Row"];

function asFont(value: string): FontKey {
  return (FONT_KEYS as readonly string[]).includes(value)
    ? (value as FontKey)
    : DEFAULT_THEME.bodyFont;
}

function asMode(value: string): ColorMode {
  return (COLOR_MODES as readonly string[]).includes(value) ? (value as ColorMode) : "system";
}

export function rowToTheme(row: ThemeRow): Theme {
  return {
    logoPath: row.logo_path,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    backgroundColor: row.background_color,
    headingFont: asFont(row.heading_font),
    bodyFont: asFont(row.body_font),
    radius: row.radius,
    colorMode: asMode(row.color_mode),
  };
}

/** Theme of a tenant for its public pages (works for anonymous guests). Falls back to the platform default. */
export const getTenantTheme = cache(async (tenantId: string): Promise<Theme> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("tenant_theme", { p_tenant_id: tenantId }).maybeSingle();
  return data ? rowToTheme(data) : DEFAULT_THEME;
});
