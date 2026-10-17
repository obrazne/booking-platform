import "server-only";
import { getTranslations } from "next-intl/server";
import { getEnabledModules } from "@/core/modules/registry";
import type { Crumb } from "./breadcrumbs";

type Group = "reservations" | "offer" | "settings";

/** Breadcrumbs of a page inside a menu group (v1.2): the group leads to its first page, the page is last. */
export async function groupCrumbs(group: Group, page: string, tenantId: string): Promise<Crumb[]> {
  const t = await getTranslations("nav");
  const first =
    group === "reservations"
      ? "/admin/reservations"
      : group === "settings"
        ? "/admin/settings"
        : (await getEnabledModules(tenantId)).some((m) => m.key === "services")
          ? "/admin/services"
          : "/admin/testimonials";
  const label =
    group === "reservations"
      ? t("reservations")
      : group === "settings"
        ? t("settings")
        : t("offer");
  return [{ label, href: first }, { label: page }];
}
