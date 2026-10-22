"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import {
  LICENSE_DEFAULTS,
  LICENSE_PACKAGES,
  LICENSE_STATES,
  type LicensePackage,
} from "@/core/licenses/basis";
import { saveLicense } from "./actions";

export type LicenseFormValues = {
  number: string;
  package: LicensePackage;
  modules: string[];
  property_ids: string[];
  setup_fee: string;
  monthly_fee: string;
  percent: string;
  starts_on: string;
  contract_until: string;
  state: string;
  note: string;
};

const euros = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");

/** The record of the contract (Z81): number, package, modules, properties, fees, dates, state. */
export function LicenseForm({
  tenantId,
  values,
  properties,
  modules,
}: {
  tenantId: string;
  values: LicenseFormValues;
  properties: { id: string; name: string }[];
  modules: { key: string; name: string }[];
}) {
  const t = useTranslations("platform.license");
  const [pkg, setPkg] = useState<LicensePackage>(values.package);
  const [monthly, setMonthly] = useState(values.monthly_fee);
  return (
    <ActionForm action={saveLicense.bind(null, tenantId)} bar={false} className="gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("number")} htmlFor="lic-number" hint={t("numberHint")}>
          <Input
            id="lic-number"
            name="number"
            required
            maxLength={40}
            defaultValue={values.number}
          />
        </Field>
        <Field label={t("state")} htmlFor="lic-state" hint={t("stateHint")}>
          <select
            id="lic-state"
            name="state"
            defaultValue={values.state}
            className="border-input h-10 rounded-full border bg-white px-4 text-sm"
          >
            {LICENSE_STATES.map((s) => (
              <option key={s} value={s}>
                {t(`states.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("package")}</legend>
        {LICENSE_PACKAGES.map((p) => (
          <label key={p} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="package"
              value={p}
              checked={pkg === p}
              onChange={() => {
                setPkg(p);
                // The fee of the package as a start (Martin can agree on another one).
                setMonthly(euros(LICENSE_DEFAULTS.monthlyFeeCents[p]));
              }}
              className="accent-primary mt-0.5 size-4"
            />
            <span className="grid gap-0.5">
              <span className="font-medium">{t(`packages.${p}`)}</span>
              <span className="text-muted-foreground text-xs">{t(`packages.${p}Hint`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {pkg === "basic" && modules.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t("modules")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {modules.map((m) => (
              <Label key={m.key} className="font-normal">
                <Checkbox
                  name="modules"
                  value={m.key}
                  defaultChecked={values.modules.includes(m.key)}
                />{" "}
                {m.name}
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {properties.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t("properties")}</legend>
          <p className="text-muted-foreground text-xs">{t("propertiesHint")}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {properties.map((p) => (
              <Label key={p.id} className="font-normal">
                <Checkbox
                  name="property_ids"
                  value={p.id}
                  defaultChecked={values.property_ids.includes(p.id)}
                />{" "}
                {p.name}
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("setupFee")} htmlFor="lic-setup">
          <Input
            id="lic-setup"
            name="setup_fee"
            inputMode="decimal"
            defaultValue={values.setup_fee}
          />
        </Field>
        <Field label={t("monthlyFee")} htmlFor="lic-monthly">
          <Input
            id="lic-monthly"
            name="monthly_fee"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
        </Field>
        <Field label={t("percent")} htmlFor="lic-percent" hint={t("percentHint")}>
          <Input
            id="lic-percent"
            name="percent"
            inputMode="decimal"
            defaultValue={values.percent}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("startsOn")} htmlFor="lic-start">
          <Input
            id="lic-start"
            name="starts_on"
            type="date"
            required
            defaultValue={values.starts_on}
          />
        </Field>
        <Field label={t("contractUntil")} htmlFor="lic-until" hint={t("contractUntilHint")}>
          <Input
            id="lic-until"
            name="contract_until"
            type="date"
            defaultValue={values.contract_until}
          />
        </Field>
      </div>
      <Field label={t("note")} htmlFor="lic-note">
        <Textarea id="lic-note" name="note" rows={2} maxLength={1000} defaultValue={values.note} />
      </Field>
      <div>
        <SubmitButton>{t("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
