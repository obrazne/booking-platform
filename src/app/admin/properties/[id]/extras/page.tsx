import { getLocale, getTranslations } from "next-intl/server";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
import { formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { asLocalized, tr } from "@/core/i18n/localized";
import { deleteDiscount, deleteFee, saveDiscount, saveFee } from "../../actions";
import { centsToInput, getPropertyForEdit } from "../../data";

const PRICE_MODELS = [
  "per_stay",
  "per_night",
  "per_person",
  "per_person_night",
  "per_item",
] as const;

function Select({
  name,
  defaultValue,
  options,
  id,
}: {
  name: string;
  id: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default async function ExtrasPage({ params }: PageProps<"/admin/properties/[id]/extras">) {
  const { id } = await params;
  const [t, tf, tp, locale] = await Promise.all([
    getTranslations("extras"),
    getTranslations("forms"),
    getTranslations("priceModels"),
    getLocale(),
  ]);
  const { tenant, property, fees, discounts } = await getPropertyForEdit(id);
  const L = tenant.locales;

  const feeForm = (fee?: (typeof fees)[number]) => {
    const k = fee?.id ?? "new-fee";
    return (
      <ActionForm action={saveFee} bar={Boolean(fee)}>
        <input type="hidden" name="id" value={fee?.id ?? ""} />
        <input type="hidden" name="property_id" value={property.id} />
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <LocalizedField
            name="name"
            label={t("fees")}
            locales={L}
            value={asLocalized(fee?.name)}
          />
          <Field label={t("feeKind.label")} htmlFor={`kind-${k}`}>
            <Select
              id={`kind-${k}`}
              name="kind"
              defaultValue={fee?.kind ?? "optional"}
              options={(["automatic", "optional", "pet"] as const).map((v) => ({
                value: v,
                label: t(`feeKind.${v}`),
              }))}
            />
          </Field>
          <Field label={t("priceModel")} htmlFor={`model-${k}`}>
            <Select
              id={`model-${k}`}
              name="price_model"
              defaultValue={fee?.price_model ?? "per_stay"}
              options={PRICE_MODELS.map((v) => ({ value: v, label: tp(v) }))}
            />
          </Field>
          <Field label={`${t("amount")} (${tenant.currency})`} htmlFor={`amount-${k}`}>
            <Input
              id={`amount-${k}`}
              name="amount"
              inputMode="decimal"
              required
              defaultValue={centsToInput(fee?.amount_cents)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Label className="font-normal">
            <Checkbox name="refundable_deposit" defaultChecked={fee?.refundable_deposit ?? false} />{" "}
            {t("deposit")}
          </Label>
          <Label className="font-normal">
            <Checkbox name="active" defaultChecked={fee?.active ?? true} /> {t("active")}
          </Label>
        </div>
        <div className="flex gap-2">
          <SubmitButton>{fee ? tf("save") : tf("add")}</SubmitButton>
          {fee ? <DeleteButton action={deleteFee.bind(null, property.id, fee.id)} /> : null}
        </div>
      </ActionForm>
    );
  };

  const discountForm = (d?: (typeof discounts)[number]) => {
    const k = d?.id ?? "new-discount";
    const date = (name: string, label: string, value: string | null | undefined) => (
      <Field label={label} htmlFor={`${name}-${k}`}>
        <Input id={`${name}-${k}`} name={name} type="date" defaultValue={value ?? ""} />
      </Field>
    );
    const num = (name: string, label: string, value: number | null | undefined) => (
      <Field label={label} htmlFor={`${name}-${k}`}>
        <Input id={`${name}-${k}`} name={name} type="number" min={1} defaultValue={value ?? ""} />
      </Field>
    );
    return (
      <ActionForm action={saveDiscount} bar={Boolean(d)}>
        <input type="hidden" name="id" value={d?.id ?? ""} />
        <input type="hidden" name="property_id" value={property.id} />
        <div className="grid gap-4 sm:grid-cols-4">
          <LocalizedField
            name="name"
            label={t("discounts")}
            locales={L}
            value={asLocalized(d?.name)}
          />
          <Field label={t("discountKind.label")} htmlFor={`dkind-${k}`}>
            <Select
              id={`dkind-${k}`}
              name="kind"
              defaultValue={d?.kind ?? "length_of_stay"}
              options={(["length_of_stay", "promo"] as const).map((v) => ({
                value: v,
                label: t(`discountKind.${v}`),
              }))}
            />
          </Field>
          <Field label={t("code")} htmlFor={`code-${k}`}>
            <Input
              id={`code-${k}`}
              name="code"
              defaultValue={d?.code ?? ""}
              className="uppercase"
            />
          </Field>
          <Field label={`${t("percent")} / ${t("fixedAmount")} (${tenant.currency})`}>
            <div className="flex gap-2">
              <Input
                name="percent"
                inputMode="decimal"
                aria-label={t("percent")}
                defaultValue={d?.percent_bp ? String(d.percent_bp / 100) : ""}
              />
              <Input
                name="fixed"
                inputMode="decimal"
                aria-label={t("fixedAmount")}
                defaultValue={centsToInput(d?.amount_cents)}
              />
            </div>
          </Field>
          {num("min_nights", t("minNights"), d?.min_nights)}
          {num("min_guests", t("minGuests"), d?.min_guests)}
          {num("max_guests", t("maxGuests"), d?.max_guests)}
          <div />
          {date("booked_from", t("bookedFrom"), d?.booked_from)}
          {date("booked_until", t("bookedUntil"), d?.booked_until)}
          {date("stay_from", t("stayFrom"), d?.stay_from)}
          {date("stay_until", t("stayUntil"), d?.stay_until)}
          {date("excluded_from", t("excludedFrom"), d?.excluded_from)}
          {date("excluded_until", t("excludedUntil"), d?.excluded_until)}
        </div>
        <Label className="font-normal">
          <Checkbox name="active" defaultChecked={d?.active ?? true} /> {t("active")}
        </Label>
        <div className="flex gap-2">
          <SubmitButton>{d ? tf("save") : tf("add")}</SubmitButton>
          {d ? <DeleteButton action={deleteDiscount.bind(null, property.id, d.id)} /> : null}
        </div>
      </ActionForm>
    );
  };

  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  return (
    <div className="grid gap-8">
      <ExpandableList
        heading={t("fees")}
        addLabel={t("addFee")}
        newRow={{ title: t("newFee"), content: feeForm() }}
        rows={fees.map((f) => ({
          id: f.id,
          title: tr(f.name, locale),
          meta: [
            `${fmt(f.amount_cents)} ${tp(f.price_model as (typeof PRICE_MODELS)[number])}`,
            t(`feeKind.${f.kind as "automatic" | "optional" | "pet"}`),
            f.refundable_deposit ? t("depositShort") : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status: f.active ? null : <RowState on={false}>{t("inactiveShort")}</RowState>,
          content: feeForm(f),
        }))}
      />
      <ExpandableList
        heading={t("discounts")}
        description={t("notStacking")}
        addLabel={t("addDiscount")}
        newRow={{ title: t("newDiscount"), content: discountForm() }}
        rows={discounts.map((d) => ({
          id: d.id,
          title: tr(d.name, locale),
          meta: [
            d.percent_bp
              ? `−${d.percent_bp / 100} %`
              : d.amount_cents
                ? `−${fmt(d.amount_cents)}`
                : null,
            d.code
              ? t("codeShort", { code: d.code })
              : t(`discountKind.${d.kind as "length_of_stay" | "promo"}`),
            d.min_nights ? t("fromNights", { count: d.min_nights }) : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status: d.active ? null : <RowState on={false}>{t("inactiveShort")}</RowState>,
          content: discountForm(d),
        }))}
      />
    </div>
  );
}
