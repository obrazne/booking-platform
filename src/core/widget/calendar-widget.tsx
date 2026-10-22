"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { AvailabilityCalendar, type CalendarSelection } from "@/core/booking/availability-calendar";
import { toPricingInput, type PricingCatalog } from "@/core/booking/pricing-input";
import { calculatePrice } from "@/core/pricing/calculate";
import type { IsoDate } from "@/core/pricing/dates";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  unitId: string | null;
  name: string;
  catalog: PricingCatalog;
  busy: string[];
  today: IsoDate;
  locale: string;
  /** Address of the property page on the client's booking domain (`https://…/p/<slug>`). */
  bookingUrl: string;
  /** `data-rezim="info"`: only the calendar with prices and the legend, to look at — no dates, guests or button. */
  infoOnly?: boolean;
};

/** Height of the widget for the frame on the client's website (`widget.js` listens). */
function useReportHeight(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return;
    const send = () =>
      window.parent.postMessage(
        { type: "booking-widget:height", height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    const observer = new ResizeObserver(send);
    observer.observe(el);
    send();
    return () => observer.disconnect();
  }, [ref]);
}

/** One view or one click, for the statistics of the client (no visitor data). */
function track(slug: string, kind: "view" | "continue") {
  const body = JSON.stringify({ slug, kind });
  if (!navigator.sendBeacon?.("/embed/track", new Blob([body], { type: "application/json" })))
    void fetch("/embed/track", { method: "POST", body, keepalive: true }).catch(() => undefined);
}

/**
 * The widget "kalendár s cenami" (Z83, A17 level 2): the calendar of the property page (prices in days, busy days,
 * minimum nights and arrival days by season, price preview), guests, the total and "Pokračovať na rezerváciu", which
 * opens the property page in the main window with the dates and the cart open. Payment stays in the application.
 * With `infoOnly` (Chalet STRÖMY for now: guests look and then write to the owner) only the calendar and its legend.
 */
export function CalendarWidget({
  slug,
  unitId,
  name,
  catalog,
  busy,
  today,
  locale,
  bookingUrl,
  infoOnly = false,
}: Props) {
  const t = useTranslations("guest.widget");
  const root = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<CalendarSelection>({ checkIn: null, checkOut: null });
  const [adults, setAdults] = useState(Math.min(2, catalog.maxGuests));
  const [children, setChildren] = useState(0);
  useReportHeight(root);
  useEffect(() => track(slug, "view"), [slug]);

  const priceOf = (checkIn: IsoDate, checkOut: IsoDate) =>
    calculatePrice(
      toPricingInput(catalog, {
        checkIn,
        checkOut,
        adults,
        children,
        pets: 0,
        selectedServices: {},
        selectedFees: {},
        promoCode: null,
        bookedOn: today,
      }),
    );
  const price = useMemo(
    () => (range.checkIn && range.checkOut ? priceOf(range.checkIn, range.checkOut) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, adults, children, catalog, today],
  );
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: catalog.currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  const href = (() => {
    if (!price?.ok || !range.checkIn || !range.checkOut) return null;
    const q = new URLSearchParams({
      check_in: range.checkIn,
      check_out: range.checkOut,
      adults: String(adults),
      children: String(children),
      utm_source: "web-klienta",
      utm_medium: "widget",
    });
    if (unitId) q.set("unit", unitId);
    return `${bookingUrl}?${q}`;
  })();

  const total = adults + children;
  const stepper = (
    label: string,
    value: number,
    set: (n: number) => void,
    min: number,
    canAdd: boolean,
  ) => (
    <div className="flex items-center gap-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={t("less", { label })}
        className="border-line inline-flex size-9 items-center justify-center rounded-full border bg-white disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-5 text-center font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={!canAdd}
        aria-label={t("more", { label })}
        className="border-line inline-flex size-9 items-center justify-center rounded-full border bg-white disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );

  return (
    <div ref={root} className="grid gap-5 p-1" data-booking-widget-root>
      <h1 className="sr-only">{t("title", { name })}</h1>
      <AvailabilityCalendar
        locale={locale}
        currency={catalog.currency}
        seasons={catalog.seasons}
        rates={catalog.rates}
        discounts={catalog.discounts}
        busy={busy}
        today={today}
        value={range}
        onChange={setRange}
        months={2}
        readOnly={infoOnly}
        stayPrice={(a, b) => {
          const r = priceOf(a, b);
          return r.ok ? r.totalCents : null;
        }}
      />
      {infoOnly ? null : (
        <>
          <div className="border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t pt-4">
            <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <legend className="sr-only">{t("guests")}</legend>
              {stepper(t("adults"), adults, setAdults, 1, total < catalog.maxGuests)}
              {stepper(t("children"), children, setChildren, 0, total < catalog.maxGuests)}
            </fieldset>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="text-ink text-[15px] font-bold" aria-live="polite" data-widget-summary>
                {/* Without the stay the calendar itself says what to choose — the total only, not the hint again. */}
                {price?.ok
                  ? t("summary", { nights: price.nights, price: money(price.totalCents) })
                  : null}
              </p>
              <a
                href={href ?? undefined}
                target="_top"
                // Without dates it is still the link (no address yet), announced as unavailable.
                role={href ? undefined : "link"}
                aria-disabled={!href}
                onClick={(e) => {
                  if (!href) e.preventDefault();
                  else track(slug, "continue");
                }}
                className={cn(
                  "bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-full px-6 text-[15px] font-bold",
                  !href && "pointer-events-none opacity-50",
                )}
              >
                {t("continue")}
              </a>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("continueHint")}</p>
        </>
      )}
    </div>
  );
}
