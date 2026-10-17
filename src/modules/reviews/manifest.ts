import { Star } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { GuestStayReview } from "./guest/stay-review";

/**
 * Reviews (Z34, B11): verified reviews from stays — data, rules (database), e-mails, notifications and the owner's
 * list in Ponuka › Recenzie; the guest reviews a finished stay in the account and the page shows verified reviews
 * with the average (Z38).
 */
export const reviewsModule: ModuleManifest = {
  key: "reviews",
  messages: "modules.reviews",
  ready: true,
  navItems: [{ href: "/admin/reviews", group: "offer", labelKey: "nav", icon: Star }],
  slots: { "guest.stay.main": GuestStayReview },
};
