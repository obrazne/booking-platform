import { ClipboardCheck } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { CheckinSection } from "./checkin-section";

/**
 * Online check-in (Z36, B11): persons of the stay by the rules of the country, sensitive fields for the owner only
 * (audited), report of foreigners, tax for accommodation. Owner: Rezervácie › Príchody and the panel of a
 * reservation; guest screens come later (Z39), until then "v príprave" in the catalog.
 */
export const checkinModule: ModuleManifest = {
  key: "checkin",
  messages: "modules.checkin",
  ready: false,
  navItems: [
    { href: "/admin/arrivals", group: "reservations", labelKey: "nav", icon: ClipboardCheck },
  ],
  slots: { "booking.detail.tabs": CheckinSection },
};
