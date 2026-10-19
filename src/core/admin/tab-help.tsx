"use client";

import { usePathname } from "next/navigation";
import { InfoTip, type InfoTipText } from "./info-tip";

/**
 * ⓘ next to the title of a page with tabs (a property, a client in the control center): explains the tab that is
 * open. `items` are keyed by the first path segment after `base` ("" = the first tab).
 */
export function TabHelp({
  base,
  items,
}: {
  base: string;
  items: Record<string, InfoTipText & { label: string }>;
}) {
  const path = usePathname();
  const key = path.startsWith(base) ? (path.slice(base.length).split("/")[1] ?? "") : "";
  const item = items[key];
  return item ? <InfoTip key={key} {...item} /> : null;
}
