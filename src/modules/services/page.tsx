import { getLocale, getTranslations } from "next-intl/server";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
import { PageHeader } from "@/core/admin/page-header";
import { formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
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
          <div className="grid gap-3 sm:grid-cols-3">
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

  const price = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  // Rule 7: compact rows (name · price and how it is counted · state), the form opens in place.
  return (
    <div data-bleed>
      <PageHeader kicker={tenant.name} title={t("title")} />
      <div className="px-5 pb-14 md:px-10">
        <ExpandableList
          rows={(services ?? []).map((s) => ({
            id: s.id,
            title: tr(s.name, locale),
            meta: `${price(s.amount_cents)} · ${tp(s.price_model as (typeof PRICE_MODELS)[number])}`,
            status: (
              <RowState on={s.active}>{s.active ? t("activeShort") : t("inactiveShort")}</RowState>
            ),
            content: form(s),
          }))}
          addLabel={t("add")}
          newRow={{ title: t("newService"), content: form() }}
          empty={t("empty")}
        />
      </div>
    </div>
  );
}
