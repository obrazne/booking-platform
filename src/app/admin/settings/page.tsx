import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireTenant } from "@/core/admin/action";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { asLocalized } from "@/core/i18n/localized";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  const active = await requireTenant();
  const [t, tf, tenant] = await Promise.all([
    getTranslations("settings"),
    getTranslations("forms"),
    getTenantInfo(active.tenantId),
  ]);
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
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
            <Field
              label={t("portalCommission")}
              htmlFor="portal_commission_bp"
              hint={t("portalCommissionHint")}
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
        <SubmitButton>{tf("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
