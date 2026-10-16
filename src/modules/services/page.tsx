import { getTranslations } from "next-intl/server";

export async function ServicesPage() {
  const t = await getTranslations("modules.services");
  return (
    <div className="grid gap-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("emptyState")}</p>
    </div>
  );
}
