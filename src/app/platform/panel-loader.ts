"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { tenantPanel } from "./panel-content";

/** Server Function behind the instant client panel of the control center (Z26). */
export async function loadTenantPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return tenantPanel(id);
}
