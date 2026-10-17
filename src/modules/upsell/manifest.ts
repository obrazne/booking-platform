import type { ModuleManifest } from "@/core/modules/types";
import { StayAccountSection } from "./stay-account";

/**
 * Upsell (Z35, B11): services ordered after the reservation with a frozen price, the stay account and "Vyúčtovať"
 * (database functions `place_order`, `decide_order`, `settle_stay_account`). The owner sees it in the reservation
 * panel and in the settings of services; guest screens come later (Z37), until then "v príprave" in the catalog.
 */
export const upsellModule: ModuleManifest = {
  key: "upsell",
  messages: "modules.upsell",
  ready: false,
  dependsOn: ["services"],
  slots: { "booking.detail.tabs": StayAccountSection },
};
