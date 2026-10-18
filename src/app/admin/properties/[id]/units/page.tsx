import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { saveUnit } from "../../actions";
import { getPropertyForEdit } from "../../data";

export default async function UnitsPage({ params }: PageProps<"/admin/properties/[id]/units">) {
  const { id } = await params;
  const [t, tf] = await Promise.all([
    getTranslations("properties.units"),
    getTranslations("forms"),
  ]);
  const { property, units } = await getPropertyForEdit(id);

  const form = (unit?: (typeof units)[number]) => (
    <ActionForm
      action={saveUnit}
      bar={Boolean(unit)}
      className="sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end"
    >
      <input type="hidden" name="id" value={unit?.id ?? ""} />
      <input type="hidden" name="property_id" value={property.id} />
      <Field label={t("name")} htmlFor={`name-${unit?.id ?? "new"}`}>
        <Input
          id={`name-${unit?.id ?? "new"}`}
          name="name"
          defaultValue={unit?.name ?? ""}
          required
        />
      </Field>
      <Field label={t("maxGuests")} htmlFor={`cap-${unit?.id ?? "new"}`}>
        <Input
          id={`cap-${unit?.id ?? "new"}`}
          name="max_guests"
          type="number"
          min={1}
          defaultValue={unit?.max_guests ?? 2}
        />
      </Field>
      {unit ? (
        <Label className="h-9 font-normal">
          <Checkbox name="active" defaultChecked={unit.active} /> {t("active")}
        </Label>
      ) : (
        <span />
      )}
      <SubmitButton>{unit ? tf("save") : t("add")}</SubmitButton>
    </ActionForm>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {units.map((u) => (
          <div key={u.id}>{form(u)}</div>
        ))}
        <div className="border-border border-t pt-4">{form()}</div>
      </CardContent>
    </Card>
  );
}
