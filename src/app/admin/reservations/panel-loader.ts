"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { reservationPanel } from "./panel-content";

/** Server Function behind the instant reservation panel: returns only the detail (Z26). */
export async function loadReservationPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return reservationPanel(id);
}
