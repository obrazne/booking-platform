"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { guestPanel } from "./panel-content";

/** Loads the card of a guest for the panel (`?panel=guest:<id>`). */
export async function loadGuestPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return guestPanel(id);
}
