import { Star } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";

/**
 * Reviews (Z34, B11): verified reviews from stays — data, rules (database), e-mails, notifications and the owner's
 * list in Ponuka › Recenzie. Guest screens come later (Z38), until then the module is "v príprave" in the catalog.
 */
export const reviewsModule: ModuleManifest = {
  key: "reviews",
  messages: "modules.reviews",
  ready: false,
  navItems: [{ href: "/admin/reviews", group: "offer", labelKey: "nav", icon: Star }],
};
