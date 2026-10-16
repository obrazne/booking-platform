import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function ServicesDashboardCard() {
  const t = await getTranslations("modules.services");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("dashboardHint")}</CardDescription>
      </CardHeader>
    </Card>
  );
}
