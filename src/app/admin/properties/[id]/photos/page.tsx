import { getTranslations } from "next-intl/server";
import { asLocalized } from "@/core/i18n/localized";
import { getPropertyForEdit, photoUrl } from "../../data";
import { PhotoCard, PhotoUploader } from "./photo-manager";

export default async function PropertyPhotosPage({
  params,
}: PageProps<"/admin/properties/[id]/photos">) {
  const { id } = await params;
  const t = await getTranslations("properties.photos");
  const { tenant, property, photos } = await getPropertyForEdit(id);

  return (
    <div className="grid gap-6">
      <PhotoUploader tenantId={tenant.id} propertyId={property.id} />
      {photos.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((p, i) => (
            <PhotoCard
              key={p.id}
              photo={{
                id: p.id,
                url: photoUrl(p.storage_path),
                alt: asLocalized(p.alt),
                category: p.category,
              }}
              propertyId={property.id}
              locales={tenant.locales}
              first={i === 0}
              last={i === photos.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
