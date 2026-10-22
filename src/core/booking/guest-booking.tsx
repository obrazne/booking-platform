"use client";

import type { PaymentMethodKey } from "@/core/payments/methods";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar, type CalendarSelection } from "@/core/booking/availability-calendar";
import { toPricingInput, type PricingCatalog } from "@/core/booking/pricing-input";
import { calculatePrice } from "@/core/pricing/calculate";
import { diffDays, type IsoDate } from "@/core/pricing/dates";
import type { PriceLine, PricingResult, Service } from "@/core/pricing/types";
import type { GuestPhoto, GuestTestimonial } from "@/core/sections/types";
import { cn } from "@/lib/utils";
import { priceContributorsFor } from "@/modules/price-contributors";
import { Cart } from "./cart";
import { GalleryModal } from "./gallery-modal";

export type BookingData = {
  slug: string;
  unitId: string;
  catalog: PricingCatalog;
  busy: string[];
  today: IsoDate;
  locale: string;
  modules: string[];
  propertyName: string;
  propertyCity: string | null;
  photos: GuestPhoto[];
  testimonials: GuestTestimonial[];
  reviewsUrl: string | null;
  settings: {
    paymentDueHours: number;
    /** Ways to pay that are on (Z69); the cart lists them. */
    paymentMethods: PaymentMethodKey[];
    /** Prepared methods shown inactive as "Pripravujeme" (staging only, Z71). */
    upcomingMethods: PaymentMethodKey[];
    /** Z77: the owner approves the reservation (within 48 h) before the payment. */
    approval: boolean;
    holdMinutes: number;
    cancellationPolicy: string;
    /** First sentence of the policy for the side panel. */
    cancellationShort: string | null;
    termsUrl: string | null;
    privacyUrl: string | null;
  };
  contact: { name: string | null; phone: string | null; whatsapp: string | null } | null;
  services: Record<string, { image: string | null; description: string }>;
  trust: string[];
  /** Reassurances of the payment step (the rest is said once next to its field, Z71). */
  trustOnPayment: string[];
  initial: {
    checkIn: IsoDate | null;
    checkOut: IsoDate | null;
    adults: number;
    children: number;
    open: boolean;
    /** Services pre-selected by "Book again" (id → quantity). */
    services?: Record<string, number>;
  };
};

export type Step = 1 | 2 | 3;
type Layer = "cart" | "gallery" | "photo";

type Ctx = {
  data: BookingData;
  range: CalendarSelection;
  setRange: (r: CalendarSelection) => void;
  adults: number;
  setAdults: (n: number) => void;
  children: number;
  setChildren: (n: number) => void;
  infants: number;
  setInfants: (n: number) => void;
  pets: number;
  setPets: (n: number) => void;
  services: Record<string, number>;
  setService: (id: string, q: number) => void;
  price: PricingResult | null;
  lines: PriceLine[];
  total: number;
  open: boolean;
  /** Opens the cart (closing the gallery — one window at a time). `calendar` shows the date picker. */
  openCart: (step?: Step, opts?: { calendar?: boolean; range?: CalendarSelection }) => void;
  closeCart: () => void;
  step: Step;
  setStep: (s: Step) => void;
  cartCalendar: boolean;
  setCartCalendar: (v: boolean) => void;
  gallery: { open: boolean; photo: number | null; highlight: number | null };
  openGallery: (index?: number) => void;
  showPhoto: (index: number | null) => void;
  closeGallery: () => void;
  money: (cents: number, digits?: number) => string;
  stayPrice: (checkIn: IsoDate, checkOut: IsoDate) => number | null;
  minRate: number | null;
  promo: { code: string; name: Record<string, string>; amountCents: number } | null;
  setPromo: (p: { code: string; name: Record<string, string>; amountCents: number } | null) => void;
  /** Z78: a gift voucher (a payment, not a discount) — what is left on it; it pays up to the total. */
  giftVoucher: { code: string; balanceCents: number } | null;
  setGiftVoucher: (g: { code: string; balanceCents: number } | null) => void;
  guest: GuestFields;
  setGuest: (g: GuestFields) => void;
  billing: BillingFields;
  setBilling: (b: BillingFields) => void;
};

export type GuestFields = {
  name: string;
  email: string;
  phone: string;
  country: string;
  note: string;
};

/** "Chcem faktúru na firmu" (Z71): the company for the invoice; an ordinary guest's address is not collected. */
export type BillingFields = {
  on: boolean;
  company: string;
  companyId: string;
  taxId: string;
  vatId: string;
  address: string;
};

/** The company is complete enough for an invoice: name, IČO, DIČ and the address (IČ DPH is optional). */
export function billingValid(b: BillingFields): boolean {
  return (
    !b.on ||
    (b.company.trim().length >= 2 &&
      b.companyId.trim().length >= 1 &&
      b.taxId.trim().length >= 1 &&
      b.address.trim().length >= 3)
  );
}

const BookingContext = createContext<Ctx | null>(null);

export function useBooking(): Ctx {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("BookingProvider missing");
  return ctx;
}

/**
 * State of the guest's booking shared by the page, the side panel, the bars, the gallery and the cart (visual v2).
 * At most one window is open; Esc and the browser's Back close one level (photo → gallery → page, cart → page).
 */
export function BookingProvider({
  data,
  children: content,
}: {
  data: BookingData;
  children: ReactNode;
}) {
  const [range, setRangeState] = useState<CalendarSelection>({
    checkIn: data.initial.checkIn,
    checkOut: data.initial.checkOut,
  });
  const [adults, setAdults] = useState(Math.max(1, data.initial.adults));
  const [children, setChildren] = useState(data.initial.children);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [services, setServices] = useState<Record<string, number>>(data.initial.services ?? {});
  const [open, setOpen] = useState(data.initial.open);
  const [step, setStep] = useState<Step>(1);
  const [cartCalendar, setCartCalendar] = useState(!data.initial.checkIn);
  const [gallery, setGallery] = useState<Ctx["gallery"]>({
    open: false,
    photo: null,
    highlight: null,
  });
  const [promo, setPromo] = useState<Ctx["promo"]>(null);
  const [giftVoucher, setGiftVoucher] = useState<Ctx["giftVoucher"]>(null);
  const [guest, setGuest] = useState<GuestFields>({
    name: "",
    email: "",
    phone: "",
    country: "SK",
    note: "",
  });
  const [billing, setBilling] = useState<BillingFields>({
    on: false,
    company: "",
    companyId: "",
    taxId: "",
    vatId: "",
    address: "",
  });
  const { catalog, locale, today, modules } = data;

  // History layers: every window level adds an entry, Back (popstate) closes the top one.
  const layers = useRef<Layer[]>([]);
  /** History steps we take ourselves (closing from the UI) — their popstate must not close another level. */
  const ownPops = useRef(0);
  const push = useCallback((layer: Layer) => {
    layers.current.push(layer);
    window.history.pushState({ bookingLayer: layer }, "");
  }, []);
  const closeLayer = useCallback((layer: Layer) => {
    if (layer === "photo") setGallery((g) => ({ ...g, photo: null }));
    else if (layer === "gallery") setGallery({ open: false, photo: null, highlight: null });
    else setOpen(false);
  }, []);
  useEffect(() => {
    const onPop = () => {
      if (ownPops.current > 0) {
        ownPops.current -= 1;
        return;
      }
      const top = layers.current.pop();
      if (top) closeLayer(top);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeLayer]);
  /** Closes a level from the UI; the matching history entries are removed too (without closing twice). */
  const pop = useCallback(
    (layer: Layer) => {
      const i = layers.current.lastIndexOf(layer);
      if (i < 0) {
        closeLayer(layer);
        return;
      }
      const removed = layers.current.slice(i);
      layers.current = layers.current.slice(0, i);
      for (const l of removed) closeLayer(l);
      ownPops.current += 1; // history.go(-n) fires a single popstate
      window.history.go(-removed.length);
    },
    [closeLayer],
  );
  // A cart opened by URL parameters (widget with dates) also closes with Back.
  const initialOpen = data.initial.open;
  useEffect(() => {
    if (initialOpen) push("cart");
  }, [initialOpen, push]);

  const money = (cents: number, digits = 2) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: catalog.currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : digits,
      maximumFractionDigits: cents % 100 === 0 ? 0 : digits,
    }).format(cents / 100);

  const price = useMemo(() => {
    if (!range.checkIn || !range.checkOut) return null;
    return calculatePrice(
      toPricingInput(catalog, {
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        adults,
        children,
        pets,
        selectedServices: services,
        selectedFees: {},
        promoCode: null,
        bookedOn: today,
      }),
      priceContributorsFor(modules),
    );
  }, [catalog, range, adults, children, pets, services, today, modules]);

  // A promo line from the server replaces the automatic discount when it is better (discounts never stack).
  const lines = useMemo(() => {
    if (!price?.ok) return [];
    if (!promo) return price.lines;
    const auto = price.lines.find((l) => l.kind === "discount");
    if (auto && auto.amountCents <= promo.amountCents) return price.lines;
    const rest = price.lines.filter((l) => l.kind !== "discount");
    const line: PriceLine = {
      kind: "discount",
      refId: null,
      name: promo.name,
      quantity: 1,
      unitAmountCents: promo.amountCents,
      amountCents: promo.amountCents,
      vatBp: 0,
      meta: { code: promo.code },
    };
    const i = rest.findIndex((l) => l.kind === "tax");
    return i < 0 ? [...rest, line] : [...rest.slice(0, i), line, ...rest.slice(i)];
  }, [price, promo]);
  const total = lines.filter((l) => l.kind !== "deposit").reduce((s, l) => s + l.amountCents, 0);

  const stayPrice = (checkIn: IsoDate, checkOut: IsoDate) => {
    const r = calculatePrice(
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
    return r.ok ? r.totalCents : null;
  };
  const rates = Object.values(catalog.rates).filter((r) => r > 0);
  const minRate = rates.length > 0 ? Math.min(...rates) : null;
  const setRange = (r: CalendarSelection) => {
    setRangeState(r);
    setPromo(null);
  };

  const value: Ctx = {
    data,
    range,
    setRange,
    adults,
    setAdults,
    children,
    setChildren,
    infants,
    setInfants,
    pets,
    setPets,
    services,
    setService: (id, q) => setServices((s) => ({ ...s, [id]: q })),
    price,
    lines,
    total,
    open,
    openCart: (s, opts) => {
      const next = opts?.range ?? range;
      if (opts?.range) setRange(opts.range);
      setCartCalendar(Boolean(opts?.calendar) || !next.checkIn || !next.checkOut);
      setStep(s ?? 1);
      if (gallery.open) pop("gallery");
      if (!open) {
        setOpen(true);
        push("cart");
      }
    },
    closeCart: () => pop("cart"),
    step,
    setStep,
    cartCalendar,
    setCartCalendar,
    gallery,
    openGallery: (index) => {
      if (open) pop("cart");
      setGallery({ open: true, photo: null, highlight: index ?? null });
      push("gallery");
    },
    showPhoto: (index) => {
      if (index === null) {
        if (gallery.photo !== null) pop("photo");
        return;
      }
      if (gallery.photo === null) push("photo");
      setGallery((g) => ({ ...g, photo: index }));
    },
    closeGallery: () => pop("gallery"),
    money,
    stayPrice,
    minRate,
    promo,
    setPromo,
    giftVoucher,
    setGiftVoucher,
    guest,
    setGuest,
    billing,
    setBilling,
  };
  return (
    <BookingContext.Provider value={value}>
      {content}
      <Cart />
      <GalleryModal />
    </BookingContext.Provider>
  );
}

// ------------------------------------------------------------------------------------------- shared bits

export function Counter({
  label,
  value,
  min,
  max,
  onChange,
  tone = "light",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  tone?: "light" | "accent";
}) {
  const btn =
    tone === "accent"
      ? "size-8 rounded-full border-0 bg-white/15 text-white hover:bg-white/25 hover:text-white"
      : "size-8 rounded-full";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={cn("text-sm", tone === "accent" && "text-white")}>{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={btn}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`${label} −`}
        >
          <Minus />
        </Button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={btn}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`${label} +`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function errorsText(translate: unknown, price: PricingResult | null): string | null {
  if (!price || price.ok) return null;
  // Keys are built from error codes; the typed translator cannot follow them.
  const t = translate as (key: string, values?: Record<string, number>) => string;
  return price.errors
    .map((e) =>
      t(
        `booking.priceErrors.${e.code}`,
        "min" in e ? { min: e.min } : "max" in e ? { max: e.max } : {},
      ),
    )
    .join(" ");
}

export function serviceTotal(s: Service, nights: number, persons: number, items: number): number {
  const q =
    s.priceModel === "per_night"
      ? nights * items
      : s.priceModel === "per_person"
        ? persons * items
        : s.priceModel === "per_person_night"
          ? persons * nights * items
          : items;
  return s.amountCents * q;
}

export function useDates() {
  const { data } = useBooking();
  const long = new Intl.DateTimeFormat(data.locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const short = new Intl.DateTimeFormat(data.locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
  return {
    long: (x: IsoDate) => long.format(new Date(`${x}T00:00:00Z`)),
    short: (x: IsoDate) => short.format(new Date(`${x}T00:00:00Z`)),
  };
}

/** "X € per person and night · tax included" for the current selection, or null. */
export function usePerPerson(): string | null {
  const t = useTranslations("guest");
  const { data, price, total, money, adults, children } = useBooking();
  if (!price?.ok) return null;
  const per = Math.round(total / Math.max(1, adults + children) / Math.max(1, price.nights));
  return (
    t("cart.perPersonNight", { price: money(per, 0) }) +
    (data.catalog.touristTax.included ? ` · ${t("cart.taxIncluded")}` : "")
  );
}

/**
 * The one main price (rule 4: stacked left — small label · big number · small note): without dates the from-price
 * by season, with dates the total and the price per person and night.
 */
export function usePriceBlock(): { label: string; value: string; note: string; ready: boolean } {
  const t = useTranslations("guest");
  const { data, price, total, money, minRate } = useBooking();
  const perPerson = usePerPerson();
  const perPersonModel = data.catalog.pricingModel === "per_person_night";
  if (price?.ok) {
    return {
      label: t("v2.totalFor", { count: price.nights }),
      value: money(total),
      note: perPerson ?? "",
      ready: true,
    };
  }
  return {
    label: t(perPersonModel ? "v2.pricePerson" : "v2.priceWhole"),
    value: minRate !== null ? t("v2.from", { price: money(minRate) }) : "—",
    note: t(perPersonModel ? "v2.perPersonNightBySeason" : "v2.perNightBySeason"),
    ready: false,
  };
}

// ------------------------------------------------------------------------------------------- page parts

/** "Availability and prices" section: two months with bubbles (bubbles only while no window is open). */
export function InlineAvailability() {
  const { data, range, setRange, open, gallery, stayPrice, openCart } = useBooking();
  return (
    <AvailabilityCalendar
      locale={data.locale}
      currency={data.catalog.currency}
      seasons={data.catalog.seasons}
      rates={data.catalog.rates}
      discounts={data.catalog.discounts}
      busy={data.busy}
      today={data.today}
      value={range}
      onChange={(r) => {
        setRange(r);
        // The chosen stay goes along, so the cart starts with extras, not with the calendar again.
        if (r.checkIn && r.checkOut) openCart(1, { range: r });
      }}
      months={2}
      stayPrice={stayPrice}
      bubbles={!open && !gallery.open}
    />
  );
}

/** Green price panel next to the intro (v2): dates (→ cart with calendar), the main price, View stay. */
export function SidePanel() {
  const t = useTranslations("guest");
  const { data, range, price, openCart } = useBooking();
  const d = useDates();
  const block = usePriceBlock();
  return (
    <div className="bg-surface-accent flex h-full flex-col gap-[18px] rounded-lg p-8 pb-7 text-white shadow-[0_30px_60px_-34px_rgba(17,33,47,0.45)]">
      <span className="kicker text-[11px] text-white/95">{t("v2.yourDates")}</span>
      <button
        type="button"
        onClick={() => openCart(1, { calendar: true })}
        aria-label={t("v2.chooseDates")}
        className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/30 bg-white/12 text-left focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="grid gap-1 border-r border-white/30 px-4 py-3.5">
          <span className="kicker text-[10px] text-white/95">{t("property.arrival")}</span>
          <span className="text-lg font-bold">{range.checkIn ? d.long(range.checkIn) : "—"}</span>
        </span>
        <span className="grid gap-1 px-4 py-3.5">
          <span className="kicker text-[10px] text-white/95">{t("property.departure")}</span>
          <span className="text-lg font-bold">{range.checkOut ? d.long(range.checkOut) : "—"}</span>
        </span>
      </button>
      <div className="grid gap-1.5 pt-1">
        <span className="kicker text-[11px] text-white/95">{block.label}</span>
        <span className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">
          {block.value}
        </span>
        <span className={cn("text-sm text-white/80", price && !price.ok && "text-[#ffd2c2]")}>
          {price && !price.ok ? errorsText(t, price) : block.note}
        </span>
      </div>
      <button
        type="button"
        onClick={() => openCart(1)}
        className="btn-on-accent mt-auto inline-flex min-h-12 w-full items-center justify-center gap-2.5 px-6"
      >
        {t("property.viewStay")} <ChevronRight className="size-4" />
      </button>
      {data.settings.cancellationShort ? (
        <span className="inline-flex items-center justify-center gap-2 text-center text-sm text-white/80">
          <Check className="size-4 shrink-0" /> {data.settings.cancellationShort}
        </span>
      ) : null}
    </div>
  );
}

/** Total and View stay under the page calendar. */
export function CalendarSummary() {
  const t = useTranslations("guest");
  const { price, total, money, openCart } = useBooking();
  const perPerson = usePerPerson();
  return (
    <div className="flex flex-wrap items-center gap-5 sm:justify-end">
      {price?.ok ? (
        <div className="grid text-right">
          <span className="text-ink text-2xl font-extrabold tracking-tight tabular-nums">
            {money(total)}
          </span>
          <span className="text-muted-foreground text-sm">{perPerson}</span>
        </div>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="h-12 rounded-full px-6 font-bold"
        onClick={() => openCart(1)}
      >
        {t("property.viewStay")} <ChevronRight />
      </Button>
    </div>
  );
}

/** Button that opens the cart (optionally with the calendar or a given stay) — never scrolls the page (rule 6). */
export function OpenCartButton({
  calendar,
  stay,
  className,
  children,
}: {
  calendar?: boolean;
  stay?: { checkIn: IsoDate; checkOut: IsoDate };
  className?: string;
  children: ReactNode;
}) {
  const { openCart } = useBooking();
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        openCart(1, stay ? { range: stay, calendar: false } : { calendar: Boolean(calendar) })
      }
    >
      {children}
    </button>
  );
}

/** Button that opens the gallery window, optionally highlighting a photo. */
export function GalleryButton({
  index,
  className,
  label,
  children,
}: {
  index?: number;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const { openGallery } = useBooking();
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => openGallery(index)}
    >
      {children}
    </button>
  );
}

/** One testimonial at a time with manual arrows (no autoplay — calmer and accessible). */
export function TestimonialCarousel({
  tone = "light",
  showAllLink,
  className,
}: {
  tone?: "light" | "accent";
  showAllLink?: boolean;
  className?: string;
}) {
  const t = useTranslations("guest");
  const { data, openGallery } = useBooking();
  const list = useMemo(() => {
    const featured = data.testimonials.filter((r) => r.featured);
    return featured.length > 0 ? featured : data.testimonials;
  }, [data.testimonials]);
  const [i, setI] = useState(0);
  if (list.length === 0) return null;
  const r = list[i % list.length]!;
  const accent = tone === "accent";
  const arrow = cn(
    "inline-flex size-8 items-center justify-center rounded-full border",
    accent ? "border-white/22 bg-white/10 text-white" : "border-line text-ink bg-white",
  );
  return (
    <figure
      className={cn(
        "flex flex-col gap-3.5 rounded-lg border p-5",
        accent
          ? "border-white/22 bg-white/10"
          : "border-line bg-white shadow-[0_24px_60px_-44px_rgba(17,33,47,0.2)]",
        className,
      )}
    >
      {!accent ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="kicker kicker-sans text-accent-2 text-xs">{t("v2.guestsSay")}</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {(i % list.length) + 1} / {list.length}
          </span>
        </div>
      ) : null}
      <blockquote
        aria-live="polite"
        className={cn("flex-1 leading-relaxed", accent ? "text-sm text-white" : "text-ink")}
      >
        „{r.text}“
      </blockquote>
      <figcaption className="flex items-center justify-between gap-2.5">
        <span
          className={cn(
            "font-mono text-[11px] font-medium tracking-wider uppercase",
            accent ? "text-[#ffe0c8]" : "text-accent-2",
          )}
        >
          {r.author}
        </span>
        {list.length > 1 ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              className={arrow}
              aria-label={t("v2.prevReview")}
              onClick={() => setI((i - 1 + list.length) % list.length)}
            >
              <ChevronLeft className="size-4" />
            </button>
            {accent ? (
              <span className="font-mono text-[11px] text-white/95">
                {(i % list.length) + 1} / {list.length}
              </span>
            ) : null}
            <button
              type="button"
              className={arrow}
              aria-label={t("v2.nextReview")}
              onClick={() => setI((i + 1) % list.length)}
            >
              <ChevronRight className="size-4" />
            </button>
          </span>
        ) : null}
      </figcaption>
      {showAllLink ? (
        <button
          type="button"
          onClick={() => openGallery()}
          className="border-line text-ink border-t pt-2.5 text-left text-sm font-medium"
        >
          {t("v2.allReviewsPhotos")} →
        </button>
      ) : null}
    </figure>
  );
}

/**
 * Accent bar sliding in from the top once the guest scrolls past the intro (v2): name, dates, total, View stay.
 * Hidden while a window is open. Without dates it opens the cart with the calendar (never scrolls).
 */
export function StickyBar() {
  const t = useTranslations("guest");
  const { data, range, price, total, money, open, gallery, openCart } = useBooking();
  const perPerson = usePerPerson();
  const d = useDates();
  const [past, setPast] = useState(false);
  useEffect(() => {
    const intro = document.querySelector("[data-intro]");
    if (!intro) {
      const onScroll = () => setPast(window.scrollY > 640);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const io = new IntersectionObserver(([e]) =>
      setPast(!e!.isIntersecting && e!.boundingClientRect.top < 0),
    );
    io.observe(intro);
    return () => io.disconnect();
  }, []);
  if (!past || open || gallery.open) return null;
  const ready = Boolean(price?.ok);
  const go = () => openCart(1, { calendar: !ready });
  return (
    <div className="bg-surface-accent animate-in slide-in-from-top fade-in fixed inset-x-0 top-0 z-30 hidden shadow-[0_18px_40px_-24px_rgba(17,33,47,0.6)] duration-200 lg:block">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
        <button
          type="button"
          onClick={go}
          className="flex min-w-0 flex-wrap items-center gap-x-[18px] gap-y-1.5 text-left"
        >
          <span className="truncate text-[15px] font-extrabold tracking-tight text-white">
            {data.propertyName}
          </span>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/28 px-3.5 py-1.5">
            <span className="text-sm font-medium text-[#f3f5f7]">
              {range.checkIn && range.checkOut
                ? `${d.short(range.checkIn)} – ${d.short(range.checkOut)}`
                : t("cart.selectDates")}
            </span>
            {range.checkIn && range.checkOut ? (
              <span className="text-[13px] text-white/95">
                {t("booking.nights", { count: diffDays(range.checkIn, range.checkOut) })}
              </span>
            ) : null}
          </span>
        </button>
        <div className="flex items-center gap-[18px]">
          {ready ? (
            <div className="grid text-right">
              <span className="text-xl font-extrabold tracking-tight text-white tabular-nums">
                {money(total)}
              </span>
              <span className="text-xs text-white/95">{perPerson}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={go}
            className="btn-on-accent inline-flex min-h-11 items-center gap-2.5 px-[22px] text-[15px]"
          >
            {t("property.viewStay")} <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Fixed accent bar on phones (v2): dates and guests, sum (or from-price), View stay. */
export function MobileBar() {
  const t = useTranslations("guest");
  const { range, adults, children, price, total, money, open, gallery, openCart } = useBooking();
  const d = useDates();
  const block = usePriceBlock();
  if (open || gallery.open) return null;
  const ready = Boolean(price?.ok);
  return (
    <div className="bg-surface-accent fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-5 py-3 text-white lg:hidden">
      <button
        type="button"
        className="grid min-w-0 flex-1 text-left"
        onClick={() => openCart(1, { calendar: !ready })}
      >
        <span className="truncate font-mono text-[11px] tracking-wide text-white/95 uppercase">
          {range.checkIn && range.checkOut
            ? `${d.short(range.checkIn)} – ${d.short(range.checkOut)} · ${t("cart.guestsCount", { count: adults + children })}`
            : t("cart.selectDates")}
        </span>
        <span className="text-lg font-extrabold tracking-tight tabular-nums">
          {ready ? money(total) : block.value}
        </span>
      </button>
      <button
        type="button"
        className="btn-on-accent inline-flex min-h-11 shrink-0 items-center gap-2 px-5"
        onClick={() => openCart(1, { calendar: !ready })}
      >
        {t("property.viewStay")}
      </button>
    </div>
  );
}
