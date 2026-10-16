/** URL parameter holding the open record, e.g. `?panel=member:<id>` (A18). Shared by server and client. */
export const PANEL_PARAM = "panel";

export function panelValue(type: string, id: string): string {
  return `${type}:${id}`;
}

export function parsePanel(
  value: string | string[] | undefined,
): { type: string; id: string } | null {
  if (typeof value !== "string") return null;
  const i = value.indexOf(":");
  if (i <= 0 || i === value.length - 1) return null;
  return { type: value.slice(0, i), id: value.slice(i + 1) };
}
