import { cssVariablesToString, themeToCssVariables, type Theme } from "./theme";

/** Injects the tenant theme as CSS variables for everything inside `[data-tenant-theme]`. */
export function ThemeStyle({ theme }: { theme: Theme }) {
  const css = `[data-tenant-theme]{${cssVariablesToString(themeToCssVariables(theme))}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
