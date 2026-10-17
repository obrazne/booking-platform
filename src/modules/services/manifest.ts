import { ConciergeBell } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { ServicesDashboardCard } from "./dashboard-card";
import { servicesSection } from "./section";

/** Additional services (chef, airport transfer) — the first module (A3). Skeleton until part B. */
export const servicesModule: ModuleManifest = {
  key: "services",
  messages: "modules.services",
  navItems: [{ href: "/admin/services", group: "offer", labelKey: "nav", icon: ConciergeBell }],
  slots: { "admin.dashboard.cards": ServicesDashboardCard },
  sections: [servicesSection],
};
