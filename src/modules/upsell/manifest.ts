import type { ModuleManifest } from "@/core/modules/types";
import { GuestStayAccountCard, GuestStayAccountLines } from "./guest/stay-account-card";
import { GuestStayOffers } from "./guest/stay-offers";
import { StayAccountSection } from "./stay-account";

/**
 * Upsell (Z35, Z37, B11): services ordered after the reservation with a frozen price, the stay account and "Vyúčtovať"
 * (database functions `place_order(s)`, `decide_order`, `settle_stay_account`). The owner sees it in the reservation
 * panel and in the settings of services; the guest in the stay (account and access link) — offers and the stay
 * account — and by e-mail before arrival (`upsell_tick`).
 */
export const upsellModule: ModuleManifest = {
  key: "upsell",
  messages: "modules.upsell",
  ready: true,
  dependsOn: ["services"],
  slots: {
    "booking.detail.tabs": StayAccountSection,
    "guest.stay.main": GuestStayOffers,
    "guest.stay.aside": GuestStayAccountCard,
    "guest.stay.account": GuestStayAccountLines,
  },
};
