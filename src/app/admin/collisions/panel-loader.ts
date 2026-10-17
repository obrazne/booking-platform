"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { collisionPanel } from "./panel-content";

/** Server Function behind the instant collision panel (Z42): only the detail. */
export async function loadCollisionPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return collisionPanel(id);
}
