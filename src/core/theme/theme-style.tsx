import { cssVariablesToString, themeToCssVariables, type Theme } from "./theme";

/**
 * Injects the tenant theme as CSS variables. Scoped to `[data-tenant-theme]` by default (previews in the control center);
 * guest pages pass `scope="page"` so overlays rendered outside the page tree (cart, dialogs) are themed too.
 */
export function ThemeStyle({
  theme,
  scope = "scoped",
}: {
  theme: Theme;
  scope?: "scoped" | "page";
}) {
  const selector = scope === "page" ? ":root" : "[data-tenant-theme]";
  const css = `${selector}{${cssVariablesToString(themeToCssVariables(theme))}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
