"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar, type CalendarSelection } from "@/core/booking/availability-calendar";
import type { PricingCatalog } from "@/core/booking/pricing-input";
import { toPricingInput } from "@/core/booking/pricing-input";
import { calculatePrice } from "@/core/pricing/calculate";
import { priceContributorsFor } from "@/modules/price-contributors";

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label="−"
        >
          <Minus />
        </Button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label="+"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

/** Date and guest selection with a live price; continues to the booking form with the choice in the URL. */
export function BookingBox({
  slug,
  unitId,
  catalog,
  busy,
  today,
  locale,
  modules,
  initial,
}: {
  slug: string;
  unitId: string;
  catalog: PricingCatalog;
  busy: string[];
  today: string;
  locale: string;
  modules: string[];
  initial: { checkIn: string | null; checkOut: string | null; adults: number; children: number };
}) {
  const t = useTranslations("guest");
  const router = useRouter();
  const [range, setRange] = useState<CalendarSelection>({
    checkIn: initial.checkIn,
    checkOut: initial.checkOut,
  });
  const [adults, setAdults] = useState(Math.max(1, initial.adults));
  const [children, setChildren] = useState(initial.children);

  const price = useMemo(() => {
    if (!range.checkIn || !range.checkOut) return null;
    return calculatePrice(
      toPricingInput(catalog, {
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        adults,
        children,
        pets: 0,
        selectedServices: {},
        selectedFees: {},
        promoCode: null,
        bookedOn: today,
      }),
      priceContributorsFor(modules),
    );
  }, [catalog, range, adults, children, today, modules]);

  const fmt = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: catalog.currency }).format(
      cents / 100,
    );

  function proceed() {
    if (!range.checkIn || !range.checkOut) return;
    const qs = new URLSearchParams({
      unit: unitId,
      check_in: range.checkIn,
      check_out: range.checkOut,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/p/${slug}/book?${qs}`);
  }

  return (
    <div className="bg-card border-border grid gap-5 rounded-2xl border p-5 shadow-sm">
      <AvailabilityCalendar
        locale={locale}
        currency={catalog.currency}
        seasons={catalog.seasons}
        rates={catalog.rates}
        busy={busy}
        today={today}
        value={range}
        onChange={setRange}
        months={1}
      />
      <div className="grid gap-3">
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
      </div>
      {price ? (
        price.ok ? (
          <div className="grid gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("booking.nights", { count: price.nights })}
              </span>
              <span className="text-base font-semibold">{fmt(price.totalCents)}</span>
            </div>
          </div>
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
        )
      ) : (
        <p className="text-muted-foreground text-sm">{t("booking.chooseDates")}</p>
      )}
      <Button type="button" size="lg" disabled={!price?.ok} onClick={proceed}>
        {t("property.choose")}
      </Button>
    </div>
  );
}
