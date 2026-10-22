import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreditCard, Landmark, Receipt, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireTenant } from "@/core/admin/action";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { FieldHelp } from "@/core/admin/page-help";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { parseBands } from "@/core/booking/cancellation";
import { asLocalized } from "@/core/i18n/localized";
import { isModuleEnabled } from "@/core/modules/registry";
import {
  DEFAULT_MINUTES,
  WORK_KEYS as REPORT_TASKS,
  type WorkKey,
} from "@/core/reports/monthly-view";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ConnectionsBody } from "../ical/body";
import { TeamBody } from "../team/body";
import { saveSettings } from "./actions";
import { NotificationsBody } from "./notifications/body";
import { WidgetBody } from "./widget-body";
import { SETTINGS_TABS, settingsTab, type SettingsTab } from "./tabs";

/** The ⓘ of each tab (Z66). */
const TAB_HELP: Record<SettingsTab, string> = {
  vseobecne: "settings",
  platby: "settingsPayments",
  pravidla: "settingsRules",
  prepojenia: "ical",
  upozornenia: "notifications",
  tim: "team",
  vypis: "settingsReport",
};

/**
 * Nastavenia with tabs (Z69, vizuál administrácie v1.7, doska 18): Všeobecné · Platby · Pravidlá pobytu · Prepojenia ·
 * E-maily a upozornenia · Tím · Mesačný výpis — the tab in the address (`?tab=`). Each tab with fields has its own form
 * and saves only its fields (the save bar of Z55); old addresses (/admin/ical, /admin/team, …) redirect here.
 */
export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const active = await requireTenant();
  const sp = await searchParams;
  const tab = settingsTab(sp.tab);
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
  const form = (children: React.ReactNode) => (
    <ActionForm action={saveSettings} className="gap-6">
      {children}
      <SubmitButton>{tf("save")}</SubmitButton>
    </ActionForm>
  );
  const on = s?.bank_transfer_enabled ?? true;
  const voucherOn = s?.voucher_enabled ?? false;
  const iban = s?.iban ? `${s.iban.slice(0, 4)} … ${s.iban.slice(-4)}` : null;

  const body: Record<SettingsTab, () => React.ReactNode> = {
    vseobecne: () => (
      <>
        {form(
          <>
            {/* Kontakt (Z60): the contact for guests and the signature of messages ({podpis}). */}
            <Card id="kontakt" className="scroll-mt-24">
              <CardHeader>
                <CardTitle>{t("contact.title")}</CardTitle>
                <CardDescription>{t("contact.hint")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label={t("contact.name")} htmlFor="contact_name">
                  <Input
                    id="contact_name"
                    name="contact_name"
                    defaultValue={s?.contact_name ?? ""}
                  />
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
            <Card>
              <CardHeader>
                <CardTitle>{t("business")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="has_vat_payer" value="1" />
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
                  <Checkbox name="vat_payer" defaultChecked={s?.vat_payer ?? false} />{" "}
                  {t("vatPayer")}
                </Label>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("guestLinks")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
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
                  <Field
                    label={tm("topicsSetting")}
                    hint={tm("topicsHint")}
                    htmlFor="message_topics"
                  >
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
                  <Field
                    label={tr("googleUrl")}
                    hint={tr("googleUrlHint")}
                    htmlFor="google_review_url"
                  >
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
          </>,
        )}
        <p className="text-muted-foreground text-sm">
          <Link
            href="/admin/settings/trash"
            className="text-ink font-medium underline underline-offset-4"
          >
            {t("trashLink")}
          </Link>
        </p>
      </>
    ),
    platby: () =>
      form(
        <>
          <ExpandableList
            heading={t("methods.title")}
            defaultOpen={
              ["stay_account_limit", "upsell_offer_days"].includes(String(sp.hl))
                ? "stay_account"
                : ["iban", "account_holder", "bic", "payment_due_hours"].includes(String(sp.hl))
                  ? "bank_transfer"
                  : null
            }
            description={t("methods.lead")}
            rows={[
              {
                id: "bank_transfer",
                title: (
                  <span className="inline-flex items-center gap-2.5">
                    <Landmark className="size-4" aria-hidden /> {t("methods.transfer")}
                  </span>
                ),
                status: <RowState on={on}>{on ? t("methods.on") : t("methods.off")}</RowState>,
                meta: [
                  iban ?? t("methods.noIban"),
                  t("methods.due", { hours: s?.payment_due_hours ?? 24 }),
                ].join(" · "),
                content: (
                  <div className="grid gap-4">
                    <input type="hidden" name="has_payment_methods" value="1" />
                    <Label className="font-normal">
                      <Checkbox name="bank_transfer_enabled" defaultChecked={on} />{" "}
                      {t("methods.transferOn")}
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("iban")} htmlFor="iban">
                        <Input
                          id="iban"
                          name="iban"
                          defaultValue={s?.iban ?? ""}
                          autoComplete="off"
                        />
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
                    </div>
                    <p className="text-muted-foreground max-w-prose text-sm">
                      {t("methods.transferHow")}
                    </p>
                  </div>
                ),
              },
              {
                id: "card",
                title: (
                  <span className="inline-flex items-center gap-2.5">
                    <CreditCard className="size-4" aria-hidden /> {t("methods.card")}
                  </span>
                ),
                status: <RowState on={false}>{t("methods.soon")}</RowState>,
                meta: t("methods.cardSummary"),
                content: (
                  <div className="grid gap-3">
                    <p className="max-w-prose text-sm">{t("methods.cardHow")}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" disabled>
                        {t("methods.connectStripe")}
                      </Button>
                      <span className="text-muted-foreground text-sm">{t("methods.cardSoon")}</span>
                    </div>
                  </div>
                ),
              },
              {
                // Z77: the recreation voucher — always on approval, the rest by transfer.
                id: "recreation_voucher",
                title: (
                  <span className="inline-flex items-center gap-2.5">
                    <Ticket className="size-4" aria-hidden /> {t("methods.voucher")}
                  </span>
                ),
                status: (
                  <RowState on={voucherOn}>
                    {voucherOn ? t("methods.on") : t("methods.off")}
                  </RowState>
                ),
                meta: t("methods.voucherSummary"),
                content: (
                  <div className="grid gap-3">
                    <input type="hidden" name="has_voucher" value="1" />
                    <Label className="font-normal">
                      <Checkbox name="voucher_enabled" defaultChecked={voucherOn} />{" "}
                      {t("methods.voucherOn")}
                    </Label>
                    <p className="text-muted-foreground max-w-prose text-sm">
                      {t("methods.voucherHow")}
                    </p>
                  </div>
                ),
              },
              ...(upsell
                ? [
                    {
                      id: "stay_account",
                      title: (
                        <span className="inline-flex items-center gap-2.5">
                          <Receipt className="size-4" aria-hidden /> {t("methods.stayAccount")}
                        </span>
                      ),
                      status: <RowState on>{t("methods.on")}</RowState>,
                      meta: t("methods.stayAccountSummary", {
                        amount: `${Math.round((s?.stay_account_limit_cents ?? 30000) / 100)} ${tenant.currency}`,
                      }),
                      content: (
                        <div className="grid gap-4">
                          <p className="text-muted-foreground max-w-prose text-sm">
                            {t("methods.stayAccountHow")}
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
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
                                  defaultValue={Math.round(
                                    (s?.stay_account_limit_cents ?? 30000) / 100,
                                  )}
                                />
                              </Field>
                            ) : null}
                            {upsell ? (
                              <Field
                                label={tu("offerDays")}
                                htmlFor="upsell_offer_days"
                                hint={tu("offerDaysHint")}
                              >
                                <Input
                                  id="upsell_offer_days"
                                  name="upsell_offer_days"
                                  inputMode="numeric"
                                  maxLength={20}
                                  defaultValue={(s?.upsell_offer_days ?? [7, 2]).join(", ")}
                                />
                              </Field>
                            ) : null}
                          </div>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          <div className="surface grid gap-1 px-4 py-3.5">
            <span className="text-ink flex flex-wrap items-center gap-2 text-[15px] font-bold">
              {t("methods.deposit")} <RowState on={false}>{t("methods.soon")}</RowState>
            </span>
            <span className="text-muted-foreground text-sm">{t("methods.depositHow")}</span>
          </div>
        </>,
      ),
    pravidla: () =>
      form(
        <>
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
              <Field label={t("termsUrl")} htmlFor="terms_url">
                <Input
                  id="terms_url"
                  name="terms_url"
                  type="url"
                  defaultValue={s?.terms_url ?? ""}
                />
              </Field>
              <Field label={t("privacyUrl")} htmlFor="privacy_url">
                <Input
                  id="privacy_url"
                  name="privacy_url"
                  type="url"
                  defaultValue={s?.privacy_url ?? ""}
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
        </>,
      ),
    prepojenia: () => (
      <div className="grid gap-6">
        <ConnectionsBody />
        <WidgetBody />
        <section className="surface grid gap-1 px-4 py-3.5">
          <span className="text-ink flex flex-wrap items-center gap-2 text-[15px] font-bold">
            {t("connections.more")} <RowState on={false}>{t("methods.soon")}</RowState>
          </span>
          <span className="text-muted-foreground text-sm">{t("connections.moreHow")}</span>
        </section>
      </div>
    ),
    upozornenia: () => (
      <div className="grid gap-6">
        {form(
          <>
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
          </>,
        )}
        <NotificationsBody />
      </div>
    ),
    tim: () => <TeamBody sp={sp} />,
    vypis: () => (
      <>
        {form(
          <>
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
          </>,
        )}
        <p className="text-muted-foreground text-sm">
          <Link
            href="/admin/statistics/report"
            className="text-ink font-medium underline underline-offset-4"
          >
            {t("report.open")}
          </Link>
        </p>
      </>
    ),
  };

  return (
    <div data-bleed>
      <PageHeader title={t("title")} help={TAB_HELP[tab]} />
      <PageBody className="grid gap-6">
        <nav
          aria-label={t("tabsLabel")}
          className="border-line flex gap-1 overflow-x-auto border-b"
        >
          {SETTINGS_TABS.map((key) => (
            <Link
              key={key}
              href={key === "vseobecne" ? "/admin/settings" : `/admin/settings?tab=${key}`}
              aria-current={key === tab ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                key === tab
                  ? "border-primary text-ink font-bold"
                  : "text-muted-foreground hover:text-ink border-transparent",
              )}
            >
              {t(`tabs.${key}`)}
            </Link>
          ))}
        </nav>
        <div className={cn("grid gap-6", tab !== "prepojenia" && tab !== "tim" && "max-w-3xl")}>
          {body[tab]()}
        </div>
      </PageBody>
    </div>
  );
}
