import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { DeleteButton } from "@/core/admin/delete-button";
import { formatMoney } from "@/core/format/format";
import { asLocalized, tr } from "@/core/i18n/localized";
import { monthDay } from "@/core/pricing/dates";
import { money } from "@/core/money/money";
import { deleteSeason, saveSeason } from "../../actions";
import { centsToInput, getPropertyForEdit } from "../../data";
import { SeasonRanges } from "./season-ranges";

type Range = { start_date: string; end_date: string; repeat_yearly: boolean };

/** Do two ranges share a day? Yearly ranges are compared by month-day, also when they wrap over New Year. */
function rangesOverlap(a: Range, b: Range): boolean {
  if (!a.repeat_yearly && !b.repeat_yearly)
    return a.start_date <= b.end_date && b.start_date <= a.end_date;
  const span = (r: Range): [number, number][] => {
    const s = monthDay(r.start_date);
    const e = monthDay(r.end_date);
    return s <= e
      ? [[s, e]]
      : [
          [s, 1231],
          [101, e],
        ];
  };
  return span(a).some(([s1, e1]) => span(b).some(([s2, e2]) => s1 <= e2 && s2 <= e1));
}

const WEEKDAYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export default async function PricingPage({ params }: PageProps<"/admin/properties/[id]/pricing">) {
  const { id } = await params;
  const [t, tf, locale] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("forms"),
    getLocale(),
  ]);
  const { tenant, property, units, seasons, rates } = await getPropertyForEdit(id);
  const activeUnits = units.filter((u) => u.active);
  const rateLabel =
    property.pricing_model === "per_person_night" ? t("ratePerPerson") : t("ratePerNight");

  const warnings: string[] = [];
  const named = seasons.filter((s) => !s.is_default);
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const a = named[i]!;
      const b = named[j]!;
      if (a.season_ranges.some((ra) => b.season_ranges.some((rb) => rangesOverlap(ra, rb)))) {
        warnings.push(t("overlapWarning", { a: tr(a.name, locale), b: tr(b.name, locale) }));
      }
    }
  }
  if (!seasons.some((s) => s.is_default)) warnings.push(t("noDefault"));

  const seasonForm = (season?: (typeof seasons)[number]) => (
    <ActionForm action={saveSeason}>
      <input type="hidden" name="id" value={season?.id ?? ""} />
      <input type="hidden" name="property_id" value={property.id} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <LocalizedField
          name="name"
          label={t("name")}
          locales={tenant.locales}
          value={asLocalized(season?.name)}
        />
        <Field label={t("minNights")} htmlFor={`min-${season?.id ?? "new"}`}>
          <Input
            id={`min-${season?.id ?? "new"}`}
            name="min_nights"
            type="number"
            min={1}
            defaultValue={season?.min_nights ?? 1}
          />
        </Field>
        <Field label={t("maxNights")} htmlFor={`max-${season?.id ?? "new"}`}>
          <Input
            id={`max-${season?.id ?? "new"}`}
            name="max_nights"
            type="number"
            min={1}
            defaultValue={season?.max_nights ?? ""}
          />
        </Field>
        <Field
          label={t("priority")}
          hint={t("priorityHint")}
          htmlFor={`prio-${season?.id ?? "new"}`}
        >
          <Input
            id={`prio-${season?.id ?? "new"}`}
            name="priority"
            type="number"
            defaultValue={season?.priority ?? 10}
          />
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("arrivalDays")}</legend>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map((d) => (
            <Label key={d} className="font-normal">
              <Checkbox
                name="arrival_days"
                value={d}
                defaultChecked={!season?.arrival_days || season.arrival_days.includes(Number(d))}
              />
              {t(`weekdays.${d}`)}
            </Label>
          ))}
        </div>
      </fieldset>
      {season?.is_default ? (
        <input type="hidden" name="is_default" value="true" />
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t("ranges")}</legend>
          <SeasonRanges
            initial={(season?.season_ranges ?? []).map((r) => ({
              start: r.start_date,
              end: r.end_date,
            }))}
          />
          <Label className="font-normal">
            <Checkbox
              name="repeat_yearly"
              defaultChecked={season ? season.season_ranges.every((r) => r.repeat_yearly) : true}
            />
            {t("repeatYearly")}
          </Label>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {activeUnits.map((u) => {
          const rate = rates.find((r) => r.unit_id === u.id && r.season_id === season?.id);
          return (
            <Field
              key={u.id}
              label={`${rateLabel}${property.booking_mode === "units" ? ` — ${u.name}` : ""} (${tenant.currency})`}
              htmlFor={`rate-${season?.id ?? "new"}-${u.id}`}
            >
              <Input
                id={`rate-${season?.id ?? "new"}-${u.id}`}
                name={`rate_${u.id}`}
                inputMode="decimal"
                defaultValue={centsToInput(rate?.amount_cents)}
              />
            </Field>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton>{tf("save")}</SubmitButton>
        {season && !season.is_default ? (
          <DeleteButton action={deleteSeason.bind(null, property.id, season.id)} />
        ) : null}
      </div>
    </ActionForm>
  );

  return (
    <div className="grid gap-6">
      {warnings.length > 0 ? (
        <div className="grid gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          {warnings.map((w) => (
            <p key={w} className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" /> {w}
            </p>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("seasons")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1 pr-4 font-normal">{t("name")}</th>
                <th className="py-1 pr-4 font-normal">{t("minNights")}</th>
                {activeUnits.map((u) => (
                  <th key={u.id} className="py-1 pr-4 font-normal">
                    {property.booking_mode === "units" ? u.name : rateLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.id} className="border-border border-t">
                  <td className="py-2 pr-4 font-medium">{tr(s.name, locale)}</td>
                  <td className="py-2 pr-4">{s.min_nights}</td>
                  {activeUnits.map((u) => {
                    const r = rates.find((x) => x.unit_id === u.id && x.season_id === s.id);
                    return (
                      <td key={u.id} className="py-2 pr-4">
                        {r ? formatMoney(money(r.amount_cents, tenant.currency), locale) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {seasons.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle>
              {tr(s.name, locale)}
              {s.is_default ? (
                <span className="text-muted-foreground font-normal"> · {t("isDefault")}</span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>{seasonForm(s)}</CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{t("newSeason")}</CardTitle>
        </CardHeader>
        <CardContent>{seasonForm()}</CardContent>
      </Card>
    </div>
  );
}
