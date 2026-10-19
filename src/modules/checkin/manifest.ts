import { ClipboardCheck } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { checkinTodos } from "./guest/todos";
import { CheckinSection } from "./checkin-section";
import { GuestCheckinCard } from "./guest/stay-card";

/**
 * Online check-in (Z36, Z39, B11): persons of the stay by the rules of the country, sensitive fields for the owner
 * only (audited), report of foreigners, tax for accommodation. Owner: Rezervácie › Príchody and the panel of a
 * reservation. Guest: the card in the stay (slot guest.stay.top) and the screen `/ucet/pobyt/<id>/checkin`,
 * `/r/<code>/checkin` (src/modules/checkin/guest).
 */
export const checkinModule: ModuleManifest = {
  key: "checkin",
  messages: "modules.checkin",
  ready: true,
  // Pomoc (Z67): words in modules.checkin.help.
  helpFaqs: [{ id: "foreigners", topic: "guests", href: "/admin/arrivals" }],
  navItems: [
    { href: "/admin/arrivals", group: "reservations", labelKey: "nav", icon: ClipboardCheck },
  ],
  slots: { "booking.detail.tabs": CheckinSection, "guest.stay.top": GuestCheckinCard },
  guestTodos: checkinTodos,
};
