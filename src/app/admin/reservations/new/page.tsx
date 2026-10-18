import { Breadcrumbs } from "@/core/admin/breadcrumbs";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireTenant } from "@/core/admin/action";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { tr } from "@/core/i18n/localized";
import { isModuleEnabled } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { createManualReservation } from "../actions";

/** Manual reservation; the calendar pre-fills the unit and dates (`?unit=&check_in=&check_out=`). */
export default async function ManualReservationPage({
  searchParams,
}: PageProps<"/admin/reservations/new">) {
  const active = await requireTenant();
  const sp = await searchParams;
  const pre = (key: string, re: RegExp) => {
    const v = sp[key];
    return typeof v === "string" && re.test(v) ? v : undefined;
  };
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const uuid = /^[0-9a-f-]{36}$/;
  const [t, tb, tp, locale, tNav] = await Promise.all([
    getTranslations("reservations"),
    getTranslations("guest.booking"),
    getTranslations("priceModels"),
    getLocale(),
    getTranslations("nav"),
  ]);
  const supabase = await createClient();
  const [{ data: units }, servicesOn] = await Promise.all([
    supabase
      .from("units")
      .select("id, name, active, property:properties(name, booking_mode)")
      .eq("tenant_id", active.tenantId)
      .eq("active", true)
      .order("name"),
    isModuleEnabled(active.tenantId, "services"),
  ]);
  const { data: services } = servicesOn
    ? await supabase
        .from("services")
        .select("id, name, price_model, active")
        .eq("tenant_id", active.tenantId)
        .eq("active", true)
        .order("sort")
    : { data: [] };
  const selectClass = "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";

  return (
    <div className="grid max-w-3xl gap-4">
      <Breadcrumbs
        items={[
          { label: tNav("reservations"), href: "/admin/reservations" },
          { label: t("manual.crumb") },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("manual.title")}</CardTitle>
          <CardDescription>{t("manual.hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createManualReservation} bar={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("manual.unit")} htmlFor="unit_id" className="sm:col-span-2">
                <select
                  id="unit_id"
                  name="unit_id"
                  required
                  defaultValue={pre("unit", uuid)}
                  className={selectClass}
                >
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.property?.booking_mode === "units"
                        ? `${u.property.name} — ${u.name}`
                        : (u.property?.name ?? u.name)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("manual.checkIn")} htmlFor="check_in">
                <Input
                  id="check_in"
                  name="check_in"
                  type="date"
                  required
                  defaultValue={pre("check_in", isoDate)}
                />
              </Field>
              <Field label={t("manual.checkOut")} htmlFor="check_out">
                <Input
                  id="check_out"
                  name="check_out"
                  type="date"
                  required
                  defaultValue={pre("check_out", isoDate)}
                />
              </Field>
              <Field label={tb("adults")} htmlFor="adults">
                <Input id="adults" name="adults" type="number" min={1} defaultValue={2} />
              </Field>
              <Field label={tb("children")} htmlFor="children">
                <Input id="children" name="children" type="number" min={0} defaultValue={0} />
              </Field>
              <Field label={tb("pets")} htmlFor="pets">
                <Input id="pets" name="pets" type="number" min={0} defaultValue={0} />
              </Field>
              <div />
              <Field label={tb("name")} htmlFor="guest_name">
                <Input id="guest_name" name="guest_name" required />
              </Field>
              <Field label={tb("email")} htmlFor="guest_email">
                <Input id="guest_email" name="guest_email" type="email" required />
              </Field>
              <Field label={tb("phone")} htmlFor="guest_phone">
                <Input id="guest_phone" name="guest_phone" type="tel" />
              </Field>
              <Field label={t("manual.statusLabel")} htmlFor="status">
                <select id="status" name="status" defaultValue="confirmed" className={selectClass}>
                  <option value="confirmed">{t("statuses.confirmed")}</option>
                  <option value="pending_payment">{t("statuses.pending_payment")}</option>
                </select>
              </Field>
              <Field label={tb("note")} htmlFor="guest_note" className="sm:col-span-2">
                <Textarea id="guest_note" name="guest_note" rows={2} />
              </Field>
            </div>
            {(services ?? []).length > 0 ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">{tb("services")}</legend>
                {(services ?? []).map((s) => (
                  <Label key={s.id} className="font-normal">
                    <Checkbox name={`service_${s.id}`} value="1" /> {tr(s.name, locale)}
                    <span className="text-muted-foreground">
                      ({tp(s.price_model as "per_stay")})
                    </span>
                  </Label>
                ))}
              </fieldset>
            ) : null}
            <Label className="font-normal">
              <Checkbox name="paid" /> {t("manual.paid")}
            </Label>
            <SubmitButton>{t("manual.create")}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
