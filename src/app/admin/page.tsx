import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleSlot } from "@/core/modules/module-slot";
import { getActiveMembership } from "@/core/tenant/active";

export default async function AdminDashboard() {
  const t = await getTranslations("admin");
  const active = await getActiveMembership();

  if (!active) {
    return <p className="text-muted-foreground max-w-prose">{t("noMembership")}</p>;
  }

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("dashboardTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{active.tenantName}</CardTitle>
            <CardDescription>{t("dashboardHint")}</CardDescription>
          </CardHeader>
        </Card>
        <ModuleSlot
          name="admin.dashboard.cards"
          tenantId={active.tenantId}
          locale={await getLocale()}
        />
      </div>
    </div>
  );
}
