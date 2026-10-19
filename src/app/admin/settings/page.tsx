import { FieldHelp } from "@/core/admin/page-help";
import { PageHelp } from "@/core/admin/page-help";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireTenant } from "@/core/admin/action";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { asLocalized } from "@/core/i18n/localized";
import { getTenantInfo } from "@/core/tenant/info";
import { isModuleEnabled } from "@/core/modules/registry";
import { parseBands } from "@/core/booking/cancellation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_MINUTES,
  WORK_KEYS as REPORT_TASKS,
  type WorkKey,
} from "@/core/reports/monthly-view";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  const active = await requireTenant();
  const [t, tf, tu, tc, tr, tm, tenant, upsell, checkin, reviews, messages] = await Promise.all([
    getTranslations("settings"),
    getTranslations("forms"),
    getTranslations("modules.upsell"),
    getTranslations("modules.checkin.settings"),
    getTranslations("modules.reviews"),
    getTranslations("modules.messages.guest"),
    getTenantInfo(active.tenantId),
    isModuleEnabled(active.tenantId, "upsell"),
    isModuleEnabled(active.tenantId, "checkin"),
    isModuleEnabled(active.tenantId, "reviews"),
    isModuleEnabled(active.tenantId, "messages"),
  ]);
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  const bands = parseBands(s?.cancellation_bands);
  const minutes = (s?.report_minutes ?? {}) as Partial<Record<WorkKey, number>>;
  const minutesOf = (k: WorkKey) => minutes[k] ?? DEFAULT_MINUTES[k];

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex items-center gap-2.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <PageHelp id="settings" />
      </div>
      <ActionForm action={saveSettings} className="gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("payment")}</CardTitle>
            <CardDescription>{t("dueHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("iban")} htmlFor="iban">
              <Input id="iban" name="iban" defaultValue={s?.iban ?? ""} autoComplete="off" />
            </Field>
            <Field label={t("accountHolder")} htmlFor="account_holder">
              <Input
                id="account_holder"
                name="account_holder"
                defaultValue={s?.account_holder ?? ""}
              />
            </Field>
            <Field label={t("bic")} htmlFor="bic">
              <Input id="bic" name="bic" defaultValue={s?.bic ?? ""} />
            </Field>
            <Field label={t("dueHours")} htmlFor="payment_due_hours">
              <Input
                id="payment_due_hours"
                name="payment_due_hours"
                type="number"
                min={1}
                max={336}
                defaultValue={s?.payment_due_hours ?? 24}
              />
            </Field>
            <Field label={t("holdMinutes")} htmlFor="hold_minutes">
              <Input
                id="hold_minutes"
                name="hold_minutes"
                type="number"
                min={5}
                max={240}
                defaultValue={s?.hold_minutes ?? 30}
              />
            </Field>
            {upsell ? (
              <Field
                label={tu("limit", { currency: tenant.currency })}
                htmlFor="stay_account_limit"
                hint={tu("limitHint")}
              >
                <Input
                  id="stay_account_limit"
                  name="stay_account_limit"
                  type="number"
                  min={0}
                  max={100000}
                  defaultValue={Math.round((s?.stay_account_limit_cents ?? 30000) / 100)}
                />
              </Field>
            ) : null}
            {upsell ? (
              <Field label={tu("offerDays")} htmlFor="upsell_offer_days" hint={tu("offerDaysHint")}>
                <Input
                  id="upsell_offer_days"
                  name="upsell_offer_days"
                  inputMode="numeric"
                  maxLength={20}
                  defaultValue={(s?.upsell_offer_days ?? [7, 2]).join(", ")}
                />
              </Field>
            ) : null}
            <Field
              label={t("portalCommission")}
              htmlFor="portal_commission_bp"
              info={<FieldHelp id="portalCommission" />}
            >
              <Input
                id="portal_commission_bp"
                name="portal_commission_bp"
                type="number"
                min={0}
                max={50}
                step={0.5}
                defaultValue={(s?.portal_commission_bp ?? 1500) / 100}
              />
            </Field>
            <Label className="font-normal">
              <Checkbox name="vat_payer" defaultChecked={s?.vat_payer ?? false} /> {t("vatPayer")}
            </Label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("cancellation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LocalizedField
              name="cancellation_policy"
              label={t("cancellation")}
              locales={tenant.locales}
              value={asLocalized(s?.cancellation_policy)}
              multiline
            />
            {/* Storno bands (after Z44): the calculation of the refund for the guest and the owner. */}
            <fieldset className="mt-5 grid gap-3">
              <legend className="text-ink text-sm font-medium">{t("bands.title")}</legend>
              <p className="text-muted-foreground text-[13px]">{t("bands.hint")}</p>
              {Array.from({ length: 4 }, (_, i) => {
                const band = bands[i];
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>{t("bands.atLeast")}</span>
                    <Input
                      name={`band_days_${i}`}
                      type="number"
                      min={0}
                      max={365}
                      aria-label={t("bands.daysLabel", { n: i + 1 })}
                      defaultValue={band?.days ?? ""}
                      className="w-24"
                    />
                    <span>{t("bands.daysBefore")}</span>
                    <Input
                      name={`band_pct_${i}`}
                      type="number"
                      min={0}
                      max={100}
                      aria-label={t("bands.pctLabel", { n: i + 1 })}
                      defaultValue={band?.refundPct ?? ""}
                      className="w-24"
                    />
                    <span>{t("bands.pct")}</span>
                  </div>
                );
              })}
              <p className="text-muted-foreground text-[13px]">{t("bands.rest")}</p>
            </fieldset>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("legal")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label={t("termsUrl")} htmlFor="terms_url">
              <Input id="terms_url" name="terms_url" type="url" defaultValue={s?.terms_url ?? ""} />
            </Field>
            <Field label={t("privacyUrl")} htmlFor="privacy_url">
              <Input
                id="privacy_url"
                name="privacy_url"
                type="url"
                defaultValue={s?.privacy_url ?? ""}
              />
            </Field>
            <Field label={t("reviewsUrl")} hint={t("reviewsUrlHint")} htmlFor="reviews_url">
              <Input
                id="reviews_url"
                name="reviews_url"
                type="url"
                placeholder="https://"
                defaultValue={s?.reviews_url ?? ""}
              />
            </Field>
            {messages ? (
              <Field label={tm("topicsSetting")} hint={tm("topicsHint")} htmlFor="message_topics">
                <Textarea
                  id="message_topics"
                  name="message_topics"
                  rows={3}
                  maxLength={300}
                  defaultValue={(Array.isArray(s?.message_topics) ? s.message_topics : [])
                    .map((x) => (x as Record<string, string>).sk ?? "")
                    .filter(Boolean)
                    .join("\n")}
                />
              </Field>
            ) : null}
            {reviews ? (
              <Field label={tr("googleUrl")} hint={tr("googleUrlHint")} htmlFor="google_review_url">
                <Input
                  id="google_review_url"
                  name="google_review_url"
                  type="url"
                  placeholder="https://"
                  defaultValue={s?.google_review_url ?? ""}
                />
              </Field>
            ) : null}
          </CardContent>
        </Card>
        {/* Kontakt (Z60): the contact for guests and the signature of messages ({podpis}). */}
        <Card id="kontakt" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>{t("contact.title")}</CardTitle>
            <CardDescription>{t("contact.hint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("contact.name")} htmlFor="contact_name">
              <Input id="contact_name" name="contact_name" defaultValue={s?.contact_name ?? ""} />
            </Field>
            <Field label={t("contact.phone")} htmlFor="contact_phone">
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                defaultValue={s?.contact_phone ?? ""}
              />
            </Field>
            <Field label={t("contact.whatsapp")} htmlFor="whatsapp_phone">
              <Input
                id="whatsapp_phone"
                name="whatsapp_phone"
                type="tel"
                defaultValue={s?.whatsapp_phone ?? ""}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label={t("contact.signature")}
                htmlFor="message_signature"
                hint={t("contact.signatureHint")}
              >
                <Textarea
                  id="message_signature"
                  name="message_signature"
                  rows={3}
                  maxLength={500}
                  defaultValue={s?.message_signature ?? ""}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
        {/* Mesačný výpis (Z62): minutes per task of "Za vás odpracované" and the accountant's e-mail. */}
        <Card id="vypis" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("report.title")} <FieldHelp id="reportMinutes" />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {REPORT_TASKS.map((k) => (
              <Field key={k} label={t(`report.minutes.${k}`)} htmlFor={`minutes_${k}`}>
                <Input
                  id={`minutes_${k}`}
                  name={`minutes_${k}`}
                  type="number"
                  min={0}
                  max={600}
                  defaultValue={minutesOf(k)}
                />
              </Field>
            ))}
            <Field
              label={t("report.accountant")}
              htmlFor="accountant_email"
              hint={t("report.accountantHint")}
            >
              <Input
                id="accountant_email"
                name="accountant_email"
                type="email"
                defaultValue={s?.accountant_email ?? ""}
              />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("ownerEmail")} htmlFor="owner_notification_email">
              <Input
                id="owner_notification_email"
                name="owner_notification_email"
                type="email"
                defaultValue={s?.owner_notification_email ?? ""}
              />
            </Field>
            <Field label={t("arrivalDays")} htmlFor="arrival_email_days_before">
              <Input
                id="arrival_email_days_before"
                name="arrival_email_days_before"
                type="number"
                min={0}
                max={30}
                defaultValue={s?.arrival_email_days_before ?? 3}
              />
            </Field>
          </CardContent>
        </Card>
        {checkin ? (
          // Module checkin (Z36): tax for accommodation and how long documents are kept.
          <Card>
            <CardHeader>
              <CardTitle>{tc("title")}</CardTitle>
              <CardDescription>{tc("retentionHint")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={tc("municipality")} htmlFor="city_tax_municipality">
                <Input
                  id="city_tax_municipality"
                  name="city_tax_municipality"
                  maxLength={120}
                  defaultValue={s?.city_tax_municipality ?? ""}
                />
              </Field>
              <Field label={tc("taxRate", { currency: tenant.currency })} htmlFor="city_tax">
                <Input
                  id="city_tax"
                  name="city_tax"
                  inputMode="decimal"
                  defaultValue={((s?.city_tax_cents ?? 0) / 100).toFixed(2).replace(".", ",")}
                />
              </Field>
              <Field label={tc("exemptUnder")} htmlFor="city_tax_exempt_under">
                <Input
                  id="city_tax_exempt_under"
                  name="city_tax_exempt_under"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={s?.city_tax_exempt_under ?? 18}
                />
              </Field>
              <Field label={tc("retention")} htmlFor="checkin_retention_days">
                <Input
                  id="checkin_retention_days"
                  name="checkin_retention_days"
                  type="number"
                  min={30}
                  max={3650}
                  defaultValue={s?.checkin_retention_days ?? 730}
                />
              </Field>
            </CardContent>
          </Card>
        ) : null}
        <SubmitButton>{tf("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
