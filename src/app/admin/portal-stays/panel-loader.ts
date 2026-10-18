"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { portalStayPanel } from "./panel-content";

/** Server Function behind the instant panel of a stay from a portal (Z58): only the detail. */
export async function loadPortalStayPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return portalStayPanel(id);
}
