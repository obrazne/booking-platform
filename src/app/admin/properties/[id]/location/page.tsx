import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList } from "@/core/admin/expandable-list";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { tr } from "@/core/i18n/localized";
import { createClient } from "@/lib/supabase/server";
import { addPlace, deletePlace, saveLocation } from "../../location-actions";
import { getPropertyForEdit } from "../../data";

/** "Location and surroundings" tab (B1 v2): how the position is shown and places nearby. */
export default async function PropertyLocationPage({
  params,
}: PageProps<"/admin/properties/[id]/location">) {
  const { id } = await params;
  const [{ property }, t, tf, locale] = await Promise.all([
    getPropertyForEdit(id),
    getTranslations("location"),
    getTranslations("forms"),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { data: places } = await supabase
    .from("property_places")
    .select("id, name, how, distance")
    .eq("property_id", property.id)
    .order("sort");

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("tab")}</CardTitle>
          <CardDescription>{t("coordsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveLocation.bind(null, property.id)}>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{t("mode")}</legend>
              {(["approximate", "exact"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="location_mode"
                    value={m}
                    defaultChecked={property.location_mode === m}
                  />
                  {t(m)}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("latitude")} htmlFor="latitude">
                <Input
                  id="latitude"
                  name="latitude"
                  inputMode="decimal"
                  defaultValue={property.latitude ?? ""}
                />
              </Field>
              <Field label={t("longitude")} htmlFor="longitude">
                <Input
                  id="longitude"
                  name="longitude"
                  inputMode="decimal"
                  defaultValue={property.longitude ?? ""}
                />
              </Field>
            </div>
            <SubmitButton>{tf("save")}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Rule 7: places as compact rows, the add form behind "Pridať miesto". */}
      <ExpandableList
        heading={t("places")}
        rows={(places ?? []).map((pl) => ({
          id: pl.id,
          title: tr(pl.name, locale),
          meta: [tr(pl.how, locale), pl.distance].filter(Boolean).join(" · "),
          content: (
            <div>
              <DeleteButton action={deletePlace.bind(null, property.id, pl.id)} />
            </div>
          ),
        }))}
        addLabel={t("addPlace")}
        newRow={{
          title: t("addPlace"),
          content: (
            <ActionForm
              action={addPlace.bind(null, property.id)}
              resetOnSuccess
              className="sm:grid-cols-3"
            >
              <Field label={t("placeName")} htmlFor="name">
                <Input id="name" name="name" required maxLength={80} />
              </Field>
              <Field label={t("placeHow")} htmlFor="how">
                <Input id="how" name="how" maxLength={120} />
              </Field>
              <Field label={t("placeDistance")} htmlFor="distance">
                <Input id="distance" name="distance" maxLength={40} placeholder="≈ 7 km" />
              </Field>
              <div className="sm:col-span-3">
                <SubmitButton>{t("addPlace")}</SubmitButton>
              </div>
            </ActionForm>
          ),
        }}
        empty={t("noPlaces")}
      />
    </div>
  );
}
