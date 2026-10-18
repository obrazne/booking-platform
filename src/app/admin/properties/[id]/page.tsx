import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm, Field, LocalizedField, SubmitButton } from "@/core/admin/form";
import { asLocalized, tr } from "@/core/i18n/localized";
import { isModuleEnabled } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { updateArrival, updatePropertyDetails, updatePropertyTexts, updateTerms } from "../actions";
import { centsToInput, getPropertyForEdit } from "../data";

const TERM_KINDS = ["property_type", "region", "amenity", "suitable_for"] as const;

function NativeSelect({
  name,
  defaultValue,
  options,
  id,
}: {
  name: string;
  id?: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id ?? name}
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

export default async function PropertyDetailsPage({ params }: PageProps<"/admin/properties/[id]">) {
  const { id } = await params;
  const [t, tf, tc, locale] = await Promise.all([
    getTranslations("properties"),
    getTranslations("forms"),
    getTranslations("modules.checkin.settings"),
    getLocale(),
  ]);
  const { tenant, property, termIds, arrival, arrivalPrivate } = await getPropertyForEdit(id);
  const checkin = await isModuleEnabled(tenant.id, "checkin");
  const supabase = await createClient();
  const { data: terms } = await supabase
    .from("terms")
    .select("id, kind, name, sort")
    .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
    .order("sort");
  const L = tenant.locales;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("tabs.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updatePropertyDetails}>
            <input type="hidden" name="id" value={property.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.name")} htmlFor="name">
                <Input id="name" name="name" defaultValue={property.name} required />
              </Field>
              <Field label={t("fields.slug")} hint={t("fields.slugHint")} htmlFor="slug">
                <Input id="slug" name="slug" defaultValue={property.slug} required />
              </Field>
              <Field label={t("fields.statusLabel")} htmlFor="status">
                <NativeSelect
                  name="status"
                  defaultValue={property.status}
                  options={(["draft", "published", "archived"] as const).map((s) => ({
                    value: s,
                    label: t(`status.${s}`),
                  }))}
                />
              </Field>
              <Field label={t("bookingMode.label")} htmlFor="booking_mode">
                <NativeSelect
                  name="booking_mode"
                  defaultValue={property.booking_mode}
                  options={(["whole", "units"] as const).map((s) => ({
                    value: s,
                    label: t(`bookingMode.${s}`),
                  }))}
                />
              </Field>
              <Field label={t("pricingModel.label")} htmlFor="pricing_model">
                <NativeSelect
                  name="pricing_model"
                  defaultValue={property.pricing_model}
                  options={(["per_night", "per_person_night"] as const).map((s) => ({
                    value: s,
                    label: t(`pricingModel.${s}`),
                  }))}
                />
              </Field>
              <Field label={t("fields.maxGuests")} htmlFor="max_guests">
                <Input
                  id="max_guests"
                  name="max_guests"
                  type="number"
                  min={1}
                  defaultValue={property.max_guests}
                />
              </Field>
              <Field label={t("fields.bedrooms")} htmlFor="bedrooms">
                <Input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min={0}
                  defaultValue={property.bedrooms ?? 0}
                />
              </Field>
              <Field label={t("fields.bathrooms")} htmlFor="bathrooms">
                <Input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min={0}
                  defaultValue={property.bathrooms ?? 0}
                />
              </Field>
              <Field label={t("fields.checkIn")} htmlFor="check_in_from">
                <Input
                  id="check_in_from"
                  name="check_in_from"
                  type="time"
                  defaultValue={property.check_in_from.slice(0, 5)}
                />
              </Field>
              <Field label={t("fields.checkOut")} htmlFor="check_out_until">
                <Input
                  id="check_out_until"
                  name="check_out_until"
                  type="time"
                  defaultValue={property.check_out_until.slice(0, 5)}
                />
              </Field>
              <Field label={t("fields.cleaningGap")} htmlFor="cleaning_gap_days">
                <Input
                  id="cleaning_gap_days"
                  name="cleaning_gap_days"
                  type="number"
                  min={0}
                  max={7}
                  defaultValue={property.cleaning_gap_days}
                />
              </Field>
              <Field label={`${t("fields.touristTax")} (${tenant.currency})`} htmlFor="tourist_tax">
                <Input
                  id="tourist_tax"
                  name="tourist_tax"
                  inputMode="decimal"
                  defaultValue={centsToInput(property.tourist_tax_cents)}
                />
              </Field>
              <Field label={t("fields.street")} htmlFor="street">
                <Input id="street" name="street" defaultValue={property.street ?? ""} />
              </Field>
              <Field label={t("fields.city")} htmlFor="city">
                <Input id="city" name="city" defaultValue={property.city ?? ""} />
              </Field>
              <Field label={t("fields.postalCode")} htmlFor="postal_code">
                <Input
                  id="postal_code"
                  name="postal_code"
                  defaultValue={property.postal_code ?? ""}
                />
              </Field>
              <Field label={t("fields.country")} htmlFor="country">
                <Input id="country" name="country" maxLength={2} defaultValue={property.country} />
              </Field>
              <Field label={t("fields.contactEmail")} htmlFor="contact_email">
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={property.contact_email ?? ""}
                />
              </Field>
              <Field label={t("fields.contactPhone")} htmlFor="contact_phone">
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={property.contact_phone ?? ""}
                />
              </Field>
            </div>
            <div className="grid gap-2">
              <Label className="font-normal">
                <Checkbox name="pets_allowed" defaultChecked={property.pets_allowed} />{" "}
                {t("fields.petsAllowed")}
              </Label>
              <Label className="font-normal">
                <Checkbox
                  name="tourist_tax_included"
                  defaultChecked={property.tourist_tax_included}
                />{" "}
                {t("fields.touristTaxIncluded")}
              </Label>
            </div>
            <SubmitButton>{tf("save")}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.texts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updatePropertyTexts}>
              <input type="hidden" name="id" value={property.id} />
              <LocalizedField
                name="summary"
                label={t("fields.summary")}
                locales={L}
                value={asLocalized(property.summary)}
                multiline
                rows={2}
              />
              <LocalizedField
                name="description"
                label={t("fields.description")}
                locales={L}
                value={asLocalized(property.description)}
                multiline
                rows={8}
              />
              <LocalizedField
                name="included"
                label={t("fields.included")}
                locales={L}
                value={asLocalized(property.included)}
                multiline
                rows={3}
              />
              <LocalizedField
                name="house_rules"
                label={t("fields.houseRules")}
                locales={L}
                value={asLocalized(property.house_rules)}
                multiline
                rows={4}
              />
              <SubmitButton>{tf("save")}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.arrival")}</CardTitle>
            <CardDescription>{t("fields.arrivalHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateArrival}>
              <input type="hidden" name="id" value={property.id} />
              <LocalizedField
                name="arrival"
                label={t("fields.arrival")}
                locales={L}
                value={asLocalized(arrival)}
                multiline
                rows={6}
              />
              {/* Z44: tiles of the guest's stay once the instructions unlock (private, never on the page). */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t("fields.doorCode")} htmlFor="door_code">
                  <Input
                    id="door_code"
                    name="door_code"
                    maxLength={40}
                    autoComplete="off"
                    defaultValue={arrivalPrivate?.door_code ?? ""}
                  />
                </Field>
                <Field label={t("fields.wifiName")} htmlFor="wifi_name">
                  <Input
                    id="wifi_name"
                    name="wifi_name"
                    maxLength={60}
                    autoComplete="off"
                    defaultValue={arrivalPrivate?.wifi_name ?? ""}
                  />
                </Field>
                <Field label={t("fields.wifiPassword")} htmlFor="wifi_password">
                  <Input
                    id="wifi_password"
                    name="wifi_password"
                    maxLength={60}
                    autoComplete="off"
                    defaultValue={arrivalPrivate?.wifi_password ?? ""}
                  />
                </Field>
              </div>
              {checkin ? (
                // Module checkin (Z36): when check-in opens, reminders, instructions only after check-in.
                <fieldset className="border-hair grid gap-3 border-t pt-4">
                  <legend className="label-mono float-left mb-3 w-full">
                    {tc("propertyTitle")}
                  </legend>
                  <input type="hidden" name="checkin" value="1" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={tc("opens")} htmlFor="checkin_opens_days_before">
                      <Input
                        id="checkin_opens_days_before"
                        name="checkin_opens_days_before"
                        type="number"
                        min={0}
                        max={90}
                        defaultValue={property.checkin_opens_days_before}
                      />
                    </Field>
                    <Field label={tc("reminders")} htmlFor="checkin_reminder_days">
                      <Input
                        id="checkin_reminder_days"
                        name="checkin_reminder_days"
                        defaultValue={property.checkin_reminder_days.join(", ")}
                      />
                    </Field>
                  </div>
                  <Label className="font-normal">
                    <Checkbox
                      name="checkin_required_for_instructions"
                      defaultChecked={property.checkin_required_for_instructions}
                    />{" "}
                    {tc("requiredForInstructions")}
                  </Label>
                </fieldset>
              ) : null}
              <SubmitButton>{tf("save")}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.amenities")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateTerms}>
              <input type="hidden" name="id" value={property.id} />
              {TERM_KINDS.map((kind) => (
                <fieldset key={kind} className="grid gap-2">
                  <legend className="mb-1 text-sm font-medium">
                    {t(`amenitiesGroups.${kind}`)}
                  </legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {(terms ?? [])
                      .filter((term) => term.kind === kind)
                      .map((term) => (
                        <Label key={term.id} className="font-normal">
                          <Checkbox
                            name="term"
                            value={term.id}
                            defaultChecked={termIds.has(term.id)}
                          />
                          {tr(term.name, locale)}
                        </Label>
                      ))}
                  </div>
                </fieldset>
              ))}
              <SubmitButton>{tf("save")}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
