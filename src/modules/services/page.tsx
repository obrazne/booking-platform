import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/core/admin/delete-button";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { asLocalized, tr } from "@/core/i18n/localized";
import type { TenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { deleteService, saveService } from "./actions";

const PRICE_MODELS = [
  "per_stay",
  "per_night",
  "per_person",
  "per_person_night",
  "per_item",
] as const;

function decimal(cents: number | undefined) {
  if (cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

export async function ServicesPage({ tenant }: { tenant: TenantInfo }) {
  const [t, tf, tp, locale] = await Promise.all([
    getTranslations("modules.services"),
    getTranslations("forms"),
    getTranslations("priceModels"),
    getLocale(),
  ]);
  const supabase = await createClient();
  const [{ data: services }, { data: properties }] = await Promise.all([
    supabase.from("services").select("*").eq("tenant_id", tenant.id).order("sort"),
    supabase.from("properties").select("id, name").eq("tenant_id", tenant.id).order("name"),
  ]);

  const form = (s?: NonNullable<typeof services>[number]) => {
    const k = s?.id ?? "new";
    return (
      <ActionForm action={saveService}>
        <input type="hidden" name="id" value={s?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <LocalizedField
            name="name"
            label={t("name")}
            locales={tenant.locales}
            value={asLocalized(s?.name)}
          />
          <Field label={t("property")} htmlFor={`prop-${k}`}>
            <select
              id={`prop-${k}`}
              name="property_id"
              defaultValue={s?.property_id ?? ""}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="">{t("allProperties")}</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <LocalizedField
            name="description"
            label={t("description")}
            locales={tenant.locales}
            value={asLocalized(s?.description)}
            multiline
            rows={2}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("priceModel")} htmlFor={`model-${k}`}>
              <select
                id={`model-${k}`}
                name="price_model"
                defaultValue={s?.price_model ?? "per_stay"}
                className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs"
              >
                {PRICE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {tp(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`${t("amount")} (${tenant.currency})`} htmlFor={`amount-${k}`}>
              <Input
                id={`amount-${k}`}
                name="amount"
                inputMode="decimal"
                required
                defaultValue={decimal(s?.amount_cents)}
              />
            </Field>
            <Field label={t("maxQuantity")} htmlFor={`maxq-${k}`}>
              <Input
                id={`maxq-${k}`}
                name="max_quantity"
                type="number"
                min={1}
                defaultValue={s?.max_quantity ?? ""}
              />
            </Field>
          </div>
        </div>
        <Label className="font-normal">
          <Checkbox name="active" defaultChecked={s?.active ?? true} /> {t("active")}
        </Label>
        <div className="flex gap-2">
          <SubmitButton>{s ? tf("save") : tf("add")}</SubmitButton>
          {s ? <DeleteButton action={deleteService.bind(null, s.id)} /> : null}
        </div>
      </ActionForm>
    );
  };

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
      {(services ?? []).length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}
      {(services ?? []).map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle>{tr(s.name, locale)}</CardTitle>
          </CardHeader>
          <CardContent>{form(s)}</CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>{t("newService")}</CardTitle>
        </CardHeader>
        <CardContent>{form()}</CardContent>
      </Card>
    </div>
  );
}
