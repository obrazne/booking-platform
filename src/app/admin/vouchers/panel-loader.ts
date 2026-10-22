"use server";

import type { PanelContent } from "@/core/admin/record-panel";
import { giftVoucherPanel } from "./panel-content";

/** Loads a gift voucher for the panel (`?panel=voucher:<id>`). */
export async function loadGiftVoucherPanel(id: string): Promise<PanelContent> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { body: null };
  return giftVoucherPanel(id);
}
