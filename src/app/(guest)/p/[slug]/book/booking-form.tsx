"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createGuestReservation,
  holdTerm,
  previewPromo,
  type BookingState,
} from "@/core/booking/create";
import type { PricingCatalog } from "@/core/booking/pricing-input";
import { toPricingInput } from "@/core/booking/pricing-input";
import { tr } from "@/core/i18n/localized";
import { calculatePrice } from "@/core/pricing/calculate";
import type { PriceLine } from "@/core/pricing/types";
import { priceContributorsFor } from "@/modules/price-contributors";
import { Stepper } from "../booking-box";

type Props = {
  slug: string;
  unitId: string;
  catalog: PricingCatalog;
  modules: string[];
  locale: string;
  today: string;
  stay: { checkIn: string; checkOut: string; adults: number; children: number };
  stayLabel: string;
  settings: {
    paymentDueHours: number;
    holdMinutes: number;
    cancellationPolicy: string;
    termsUrl: string | null;
    privacyUrl: string | null;
  };
};

const initial: BookingState = { error: null };

export function BookingForm({
  slug,
  unitId,
  catalog,
  modules,
  locale,
  today,
  stay,
  stayLabel,
  settings,
}: Props) {
  const t = useTranslations("guest");
  const [state, action, pending] = useActionState(createGuestReservation, initial);
  const [adults, setAdults] = useState(Math.max(1, stay.adults));
  const [children, setChildren] = useState(stay.children);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [services, setServices] = useState<Record<string, number>>({});
  const [fees, setFees] = useState<Record<string, number>>({});
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<
    { name: Record<string, string>; amountCents: number } | null | undefined
  >(undefined);
  const [holdId, setHoldId] = useState("");
  const [holdFailed, setHoldFailed] = useState(false);
  const [startedAt] = useState(() => Date.now());

  // Hold the term while the guest fills the form (B2). The hold id is kept per stay in the session,
  // so returning to the form (or React's double effect in development) does not block the guest by their own hold.
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const key = `hold:${unitId}:${stay.checkIn}:${stay.checkOut}`;
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(key);
    } catch {
      // ignore
    }
    if (stored) {
      setHoldId(stored);
      return;
    }
    holdTerm(unitId, stay.checkIn, stay.checkOut).then((id) => {
      if (id) {
        setHoldId(id);
        try {
          window.sessionStorage.setItem(key, id);
        } catch {
          // ignore
        }
      } else setHoldFailed(true);
    });
  }, [unitId, stay.checkIn, stay.checkOut]);

  const price = useMemo(
    () =>
      calculatePrice(
        toPricingInput(catalog, {
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          adults,
          children,
          pets,
          selectedServices: services,
          selectedFees: fees,
          promoCode: null,
          bookedOn: today,
        }),
        priceContributorsFor(modules),
      ),
    [catalog, stay, adults, children, pets, services, fees, today, modules],
  );

  // The promo line from the server replaces an automatic discount when it is better (discounts never stack).
  const lines: PriceLine[] = useMemo(() => {
    if (!price.ok) return [];
    if (!promo) return price.lines;
    const auto = price.lines.find((l) => l.kind === "discount");
    if (auto && auto.amountCents <= promo.amountCents) return price.lines;
    const rest = price.lines.filter((l) => l.kind !== "discount");
    const promoLine: PriceLine = {
      kind: "discount",
      refId: null,
      name: promo.name,
      quantity: 1,
      unitAmountCents: promo.amountCents,
      amountCents: promo.amountCents,
      vatBp: 0,
      meta: {},
    };
    const taxIndex = rest.findIndex((l) => l.kind === "tax");
    return taxIndex < 0
      ? [...rest, promoLine]
      : [...rest.slice(0, taxIndex), promoLine, ...rest.slice(taxIndex)];
  }, [price, promo]);
  const total = lines.filter((l) => l.kind !== "deposit").reduce((s, l) => s + l.amountCents, 0);
  const deposit = lines.filter((l) => l.kind === "deposit").reduce((s, l) => s + l.amountCents, 0);
  const fmt = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: catalog.currency }).format(
      cents / 100,
    );

  async function applyPromo() {
    setPromo(
      await previewPromo({
        slug,
        unitId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults,
        children,
        code,
      }),
    );
  }

  const optionalFees = catalog.fees.filter((f) => f.kind === "optional");
  const termsText = t("booking.consentTerms");
  const cancellationText = settings.cancellationPolicy || t("booking.consentCancellation");

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="check_in" value={stay.checkIn} />
      <input type="hidden" name="check_out" value={stay.checkOut} />
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      <input type="hidden" name="infants" value={infants} />
      <input type="hidden" name="pets" value={pets} />
      <input type="hidden" name="hold_id" value={holdId} />
      <input type="hidden" name="started_at" value={startedAt} />
      <input type="hidden" name="promo_code" value={promo ? code : ""} />
      <input type="hidden" name="consent_terms_text" value={termsText} />
      <input type="hidden" name="consent_cancellation_text" value={cancellationText} />
      <input type="hidden" name="privacy_text" value={t("booking.privacy")} />
      <input type="hidden" name="consent_marketing_text" value={t("booking.consentMarketing")} />
      {Object.entries(services).map(([id, q]) =>
        q > 0 ? <input key={id} type="hidden" name={`service_${id}`} value={q} /> : null,
      )}
      {Object.entries(fees).map(([id, q]) =>
        q > 0 ? <input key={id} type="hidden" name={`fee_${id}`} value={q} /> : null,
      )}
      {/* Honeypot for bots — hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid content-start gap-8">
        {holdFailed ? <p className="text-destructive">{t("booking.takenNow")}</p> : null}

        <section className="grid gap-4">
          <h2 className="font-heading text-xl font-semibold">{t("booking.stay")}</h2>
          <p>{stayLabel}</p>
          <div className="grid max-w-sm gap-3">
            <Stepper
              label={t("booking.adults")}
              value={adults}
              min={1}
              max={catalog.maxGuests - children}
              onChange={setAdults}
            />
            <Stepper
              label={t("booking.children")}
              value={children}
              min={0}
              max={catalog.maxGuests - adults}
              onChange={setChildren}
            />
            <Stepper
              label={t("booking.infants")}
              value={infants}
              min={0}
              max={4}
              onChange={setInfants}
            />
            {catalog.petsAllowed ? (
              <Stepper label={t("booking.pets")} value={pets} min={0} max={3} onChange={setPets} />
            ) : null}
          </div>
        </section>

        {catalog.services.length > 0 || optionalFees.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="font-heading text-xl font-semibold">{t("booking.services")}</h2>
            {catalog.services.map((s) => {
              const perItem = s.priceModel === "per_item";
              const q = services[s.id] ?? 0;
              return (
                <div
                  key={s.id}
                  className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div className="grid gap-0.5">
                    <span className="font-medium">{tr(s.name, locale)}</span>
                    <span className="text-muted-foreground text-sm">{fmt(s.amountCents)}</span>
                  </div>
                  {perItem ? (
                    <Stepper
                      label={t("booking.quantity")}
                      value={q}
                      min={0}
                      max={s.maxQuantity ?? 10}
                      onChange={(v) => setServices({ ...services, [s.id]: v })}
                    />
                  ) : (
                    <Checkbox
                      checked={q > 0}
                      onCheckedChange={(c) => setServices({ ...services, [s.id]: c ? 1 : 0 })}
                      aria-label={tr(s.name, locale)}
                    />
                  )}
                </div>
              );
            })}
            {optionalFees.map((f) => (
              <div
                key={f.id}
                className="border-border flex items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="grid gap-0.5">
                  <span className="font-medium">{tr(f.name, locale)}</span>
                  <span className="text-muted-foreground text-sm">{fmt(f.amountCents)}</span>
                </div>
                <Checkbox
                  checked={(fees[f.id] ?? 0) > 0}
                  onCheckedChange={(c) => setFees({ ...fees, [f.id]: c ? 1 : 0 })}
                  aria-label={tr(f.name, locale)}
                />
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-4">
          <h2 className="font-heading text-xl font-semibold">{t("booking.guestDetails")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="guest_name">{t("booking.name")}</Label>
              <Input id="guest_name" name="guest_name" required minLength={2} autoComplete="name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="guest_email">{t("booking.email")}</Label>
              <Input
                id="guest_email"
                name="guest_email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="guest_phone">{t("booking.phone")}</Label>
              <Input id="guest_phone" name="guest_phone" type="tel" autoComplete="tel" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="guest_country">{t("booking.country")}</Label>
              <Input id="guest_country" name="guest_country" maxLength={2} defaultValue="SK" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="guest_note">{t("booking.note")}</Label>
              <Textarea id="guest_note" name="guest_note" rows={3} maxLength={2000} />
              <p className="text-muted-foreground text-xs">{t("booking.noteHint")}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("booking.consents")}</h2>
          <Label className="items-start font-normal">
            <Checkbox name="consent_terms" required className="mt-0.5" />
            <span>
              {settings.termsUrl ? (
                <a
                  href={settings.termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {termsText}
                </a>
              ) : (
                termsText
              )}
            </span>
          </Label>
          <Label className="items-start font-normal">
            <Checkbox name="consent_cancellation" required className="mt-0.5" />
            <span>
              {t("booking.consentCancellation")}
              {settings.cancellationPolicy ? (
                <span className="text-muted-foreground block text-sm">
                  {settings.cancellationPolicy}
                </span>
              ) : null}
            </span>
          </Label>
          <Label className="items-start font-normal">
            <Checkbox name="consent_marketing" className="mt-0.5" />
            <span>{t("booking.consentMarketing")}</span>
          </Label>
          <p className="text-muted-foreground text-sm">
            {settings.privacyUrl ? (
              <a
                href={settings.privacyUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {t("booking.privacy")}
              </a>
            ) : (
              t("booking.privacy")
            )}
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="bg-card border-border grid gap-4 rounded-2xl border p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">{t("booking.summary")}</h2>
          {price.ok ? (
            <dl className="grid gap-2 text-sm">
              {lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {l.labelKey === "touristTax" ? t("touristTax") : tr(l.name, locale)}
                    {l.kind === "accommodation"
                      ? ` · ${l.quantity} × ${fmt(l.unitAmountCents)}`
                      : l.quantity > 1 && l.kind !== "discount"
                        ? ` · ${l.quantity}×`
                        : ""}
                  </dt>
                  <dd className="tabular-nums">{fmt(l.amountCents)}</dd>
                </div>
              ))}
              <div className="border-border flex justify-between border-t pt-2 text-base font-semibold">
                <dt>{t("booking.total")}</dt>
                <dd className="tabular-nums">{fmt(total)}</dd>
              </div>
              {deposit > 0 ? (
                <p className="text-muted-foreground">
                  {t("booking.deposit")}: {fmt(deposit)}
                </p>
              ) : null}
              {catalog.touristTax.included ? (
                <p className="text-muted-foreground">{t("booking.taxIncluded")}</p>
              ) : null}
            </dl>
          ) : (
            <p className="text-destructive text-sm">
              {price.errors
                .map((e) =>
                  t(
                    `booking.priceErrors.${e.code}`,
                    "min" in e ? { min: e.min } : "max" in e ? { max: e.max } : {},
                  ),
                )
                .join(" ")}
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="promo">{t("booking.promo")}</Label>
            <div className="flex gap-2">
              <Input
                id="promo"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setPromo(undefined);
                }}
                className="uppercase"
              />
              <Button type="button" variant="outline" disabled={!code.trim()} onClick={applyPromo}>
                {t("booking.promoApply")}
              </Button>
            </div>
            {promo === null ? (
              <p className="text-muted-foreground text-xs">{t("booking.promoNotApplicable")}</p>
            ) : null}
          </div>
          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {t(`booking.errors.${state.error}`)}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={pending || !price.ok || holdFailed}>
            {pending ? t("booking.submitting") : t("booking.submit")}
          </Button>
          <p className="text-muted-foreground text-xs">
            {t("booking.payNote", { hours: settings.paymentDueHours })}
            {holdId ? ` ${t("booking.held", { minutes: settings.holdMinutes })}` : ""}
          </p>
        </div>
      </aside>
    </form>
  );
}
