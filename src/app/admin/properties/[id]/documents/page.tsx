import { getLocale, getTranslations } from "next-intl/server";
import { DocumentsManager } from "@/core/admin/documents";
import { tr } from "@/core/i18n/localized";
import { createClient } from "@/lib/supabase/server";
import { getPropertyForEdit } from "../../data";

/** Documents of the property for guests, e.g. house rules (B10). */
export default async function PropertyDocumentsPage({
  params,
}: PageProps<"/admin/properties/[id]/documents">) {
  const { id } = await params;
  const [{ tenant, property }, t, locale] = await Promise.all([
    getPropertyForEdit(id),
    getTranslations("documents"),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, visible_when")
    .eq("property_id", property.id)
    .order("created_at");
  return (
    <div className="grid max-w-2xl gap-4">
      <h2 className="font-heading text-lg font-semibold">{t("heading")}</h2>
      <p className="text-muted-foreground text-sm">{t("propertyHint")}</p>
      <DocumentsManager
        tenantId={tenant.id}
        propertyId={property.id}
        collapsed
        documents={(data ?? []).map((d) => ({
          id: d.id,
          title: tr(d.title, locale),
          visibleWhen: d.visible_when,
        }))}
      />
    </div>
  );
}
