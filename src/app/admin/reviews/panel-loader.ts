"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { reviewPanel } from "./panel-content";

/** Server Function behind the review panel: returns only the detail. */
export async function loadReviewPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return reviewPanel(id);
}
