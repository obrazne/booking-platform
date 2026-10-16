"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilityCalendar, type CalendarSelection } from "@/core/booking/availability-calendar";
import {
  createGuestReservation,
  holdTerm,
  previewPromo,
  type BookingState,
} from "@/core/booking/create";
import { toPricingInput, type PricingCatalog } from "@/core/booking/pricing-input";
import { tr } from "@/core/i18n/localized";
import { calculatePrice } from "@/core/pricing/calculate";
import { diffDays, type IsoDate } from "@/core/pricing/dates";
import type { PriceLine, PricingResult, Service } from "@/core/pricing/types";
import { cn } from "@/lib/utils";
import { priceContributorsFor } from "@/modules/price-contributors";

export type BookingData = {
  slug: string;
  unitId: string;
  catalog: PricingCatalog;
  busy: string[];
  today: IsoDate;
  locale: string;
  modules: string[];
  propertyName: string;
  photos: { url: string; alt: string }[];
  settings: {
    paymentDueHours: number;
    holdMinutes: number;
    cancellationPolicy: string;
    termsUrl: string | null;
    privacyUrl: string | null;
  };
  contact: { name: string | null; phone: string | null; whatsapp: string | null } | null;
  services: Record<string, { image: string | null; description: string }>;
  trust: string[];
  initial: {
    checkIn: IsoDate | null;
    checkOut: IsoDate | null;
    adults: number;
    children: number;
    open: boolean;
  };
};

type Step = 1 | 2 | 3 | "service";

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
  openCart: (step?: Step) => void;
  closeCart: () => void;
  step: Step;
  setStep: (s: Step) => void;
  money: (cents: number, digits?: number) => string;
  stayPrice: (checkIn: IsoDate, checkOut: IsoDate) => number | null;
  minRate: number | null;
  promo: { code: string; name: Record<string, string>; amountCents: number } | null;
  setPromo: (p: { code: string; name: Record<string, string>; amountCents: number } | null) => void;
  /** Service shown in the detail view of the cart. */
  detailId: string | null;
  showService: (id: string) => void;
  guest: GuestFields;
  setGuest: (g: GuestFields) => void;
};

type GuestFields = { name: string; email: string; phone: string; country: string; note: string };

const BookingContext = createContext<Ctx | null>(null);

function useBooking(): Ctx {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("BookingProvider missing");
  return ctx;
}

/** State of the guest's booking shared by the page calendar, the side panel, the mobile bar and the cart. */
export function BookingProvider({
  data,
  children: content,
}: {
  data: BookingData;
  children: ReactNode;
}) {
  const [range, setRange] = useState<CalendarSelection>({
    checkIn: data.initial.checkIn,
    checkOut: data.initial.checkOut,
  });
  const [adults, setAdults] = useState(Math.max(1, data.initial.adults));
  const [children, setChildren] = useState(data.initial.children);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [services, setServices] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(data.initial.open);
  const [step, setStep] = useState<Step>(1);
  const [promo, setPromo] = useState<Ctx["promo"]>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestFields>({
    name: "",
    email: "",
    phone: "",
    country: "SK",
    note: "",
  });
  const { catalog, locale, today, modules } = data;

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

  const value: Ctx = {
    data,
    range,
    setRange: (r) => {
      setRange(r);
      setPromo(null);
    },
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
    openCart: (s) => {
      setStep(s ?? 1);
      setOpen(true);
    },
    closeCart: () => setOpen(false),
    step,
    setStep,
    money,
    stayPrice,
    minRate,
    promo,
    setPromo,
    detailId,
    showService: (id) => {
      setDetailId(id);
      setStep("service");
    },
    guest,
    setGuest,
  };
  return (
    <BookingContext.Provider value={value}>
      {content}
      <CartSheet />
    </BookingContext.Provider>
  );
}

// ------------------------------------------------------------------------------------------- shared bits

function Counter({
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
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
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
          className="size-8 rounded-full"
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

function errorsText(
  t: ReturnType<typeof useTranslations>,
  price: PricingResult | null,
): string | null {
  if (!price || price.ok) return null;
  return price.errors
    .map((e) =>
      t(
        `booking.priceErrors.${e.code}`,
        "min" in e ? { min: e.min } : "max" in e ? { max: e.max } : {},
      ),
    )
    .join(" ");
}

function Breakdown() {
  const { lines, money, data } = useBooking();
  const t = useTranslations("guest");
  return (
    <dl className="grid gap-2 text-sm">
      {lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {l.labelKey === "touristTax" ? t("touristTax") : tr(l.name, data.locale)}
            {l.kind === "accommodation" ? ` · ${l.quantity} × ${money(l.unitAmountCents)}` : ""}
          </dt>
          <dd className="tabular-nums">{money(l.amountCents)}</dd>
        </div>
      ))}
    </dl>
  );
}

function serviceTotal(s: Service, nights: number, persons: number, items: number): number {
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

// ------------------------------------------------------------------------------------------- page parts

/** "Availability and prices" section: two months with bubbles (bubbles only while the cart is closed). */
export function InlineAvailability() {
  const { data, range, setRange, open, stayPrice, openCart } = useBooking();
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
        if (r.checkIn && r.checkOut) openCart(1);
      }}
      months={2}
      stayPrice={stayPrice}
      bubbles={!open}
    />
  );
}

/** Sticky panel on the right (desktop). */
export function SidePanel() {
  const t = useTranslations("guest");
  const { data, range, adults, children, price, total, openCart, money, minRate, lines } =
    useBooking();
  const fmt = new Intl.DateTimeFormat(data.locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const d = (x: IsoDate | null) => (x ? fmt.format(new Date(`${x}T00:00:00Z`)) : "—");
  const ready = Boolean(price?.ok);
  return (
    <div className="bg-card border-line grid gap-4 rounded-3xl border p-6 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-baseline justify-between gap-2">
        {minRate !== null ? (
          <p className="text-lg">
            {t(
              data.catalog.pricingModel === "per_person_night"
                ? "property.fromPersonNight"
                : "property.fromNight",
              {
                price: money(minRate),
              },
            )}
          </p>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => openCart(1)}
        >
          {t("property.expand")}
        </Button>
      </div>
      <div className="border-line grid grid-cols-2 overflow-hidden rounded-2xl border">
        <button
          type="button"
          onClick={() => openCart(1)}
          className="border-line grid gap-0.5 border-r p-3 text-left"
        >
          <span className="kicker text-muted-foreground">{t("property.arrival")}</span>
          <span className="text-sm">{d(range.checkIn)}</span>
        </button>
        <button type="button" onClick={() => openCart(1)} className="grid gap-0.5 p-3 text-left">
          <span className="kicker text-muted-foreground">{t("property.departure")}</span>
          <span className="text-sm">{d(range.checkOut)}</span>
        </button>
        <button
          type="button"
          onClick={() => openCart(1)}
          className="border-line col-span-2 grid gap-0.5 border-t p-3 text-left"
        >
          <span className="kicker text-muted-foreground">{t("property.guestsLabel")}</span>
          <span className="text-sm">{adults + children}</span>
        </button>
      </div>
      {ready ? (
        <>
          <dl className="grid gap-1.5 text-sm">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {l.labelKey === "touristTax" ? t("touristTax") : tr(l.name, data.locale)}
                  {l.kind === "accommodation" ? ` · ${l.quantity}×` : ""}
                </dt>
                <dd className="tabular-nums">{money(l.amountCents)}</dd>
              </div>
            ))}
          </dl>
          <div className="border-line flex items-baseline justify-between border-t pt-3">
            <span className="font-medium">{t("booking.total")}</span>
            <span className="text-2xl font-semibold tabular-nums">{money(total)}</span>
          </div>
        </>
      ) : (
        <p
          className={cn("text-sm", price && !price.ok ? "text-[#b5532f]" : "text-muted-foreground")}
        >
          {errorsText(t, price) ?? t("booking.chooseDates")}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        className="rounded-full"
        onClick={() => openCart(ready ? 2 : 1)}
      >
        {t("property.continueToDetails")}
      </Button>
      <p className="text-muted-foreground text-xs">
        {t("booking.payNote", { hours: data.settings.paymentDueHours })}
      </p>
    </div>
  );
}

/** Bottom bar on phones: sum, short description, Book. */
export function MobileBar() {
  const t = useTranslations("guest");
  const { data, price, total, money, minRate, openCart, services, range } = useBooking();
  const chosen = data.catalog.services
    .filter((s) => (services[s.id] ?? 0) > 0)
    .map((s) => tr(s.name, data.locale));
  return (
    <div className="bg-background/95 border-line fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-4 py-3 backdrop-blur lg:hidden">
      <div className="grid min-w-0 flex-1">
        {price?.ok ? (
          <>
            <span className="font-semibold tabular-nums">{money(total)}</span>
            <span className="text-muted-foreground truncate text-xs">
              {chosen.length > 0
                ? t("cart.stayWithServices", {
                    nights: diffDays(range.checkIn!, range.checkOut!),
                    services: chosen.join(", "),
                  })
                : t("booking.nights", { count: price.nights })}
            </span>
          </>
        ) : minRate !== null ? (
          <span className="text-sm">
            {t(
              data.catalog.pricingModel === "per_person_night"
                ? "property.fromPersonNight"
                : "property.fromNight",
              {
                price: money(minRate),
              },
            )}
          </span>
        ) : null}
      </div>
      <Button type="button" className="rounded-full" onClick={() => openCart(1)}>
        {t("cart.book")}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- cart

function CartSheet() {
  const { open, closeCart, step } = useBooking();
  const t = useTranslations("guest.cart");
  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeCart()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[480px] [&>button]:hidden">
        <SheetTitle className="sr-only">{t("step1")}</SheetTitle>
        {step === 1 ? (
          <StepStay />
        ) : step === 2 ? (
          <StepDetails />
        ) : step === 3 ? (
          <StepPayment />
        ) : (
          <ServiceDetail />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartHeader({ kicker, onBack }: { kicker: string; onBack?: () => void }) {
  const { closeCart } = useBooking();
  const t = useTranslations("guest.cart");
  return (
    <div className="flex items-center gap-2 px-6 pt-5">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-2 rounded-full"
          onClick={onBack}
          aria-label={t("back")}
        >
          <ArrowLeft />
        </Button>
      ) : null}
      <span className="kicker text-muted-foreground flex-1">{kicker}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-mr-2 rounded-full"
        onClick={closeCart}
        aria-label={t("close")}
      >
        <X />
      </Button>
    </div>
  );
}

function CartFooter({ children }: { children: ReactNode }) {
  return <div className="border-line bg-background grid gap-3 border-t px-6 py-4">{children}</div>;
}

function useHold() {
  const { data, range } = useBooking();
  const [holdId, setHoldId] = useState("");
  const [failed, setFailed] = useState(false);
  const requested = useRef("");
  useEffect(() => {
    if (!range.checkIn || !range.checkOut) return;
    const key = `hold:${data.unitId}:${range.checkIn}:${range.checkOut}`;
    if (requested.current === key) return;
    requested.current = key;
    setFailed(false);
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
    holdTerm(data.unitId, range.checkIn, range.checkOut).then((id) => {
      if (id) {
        setHoldId(id);
        try {
          window.sessionStorage.setItem(key, id);
        } catch {
          // ignore
        }
      } else setFailed(true);
    });
  }, [data.unitId, range.checkIn, range.checkOut]);
  return { holdId, failed };
}

function StepStay() {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, range, setRange, price, total, money, adults, children, infants, pets } = b;
  const [calendarOpen, setCalendarOpen] = useState(!range.checkIn || !range.checkOut);
  const [showLines, setShowLines] = useState(false);
  const fmt = new Intl.DateTimeFormat(data.locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const d = (x: IsoDate) => fmt.format(new Date(`${x}T00:00:00Z`));
  const ready = Boolean(price?.ok);
  const nights = price?.ok ? price.nights : 0;
  const persons = adults + children;
  const recommendation =
    data.catalog.services.find((s) => !(b.services[s.id] > 0)) ?? data.catalog.services[0];
  const contact = data.contact;
  const wa =
    contact?.whatsapp && range.checkIn && range.checkOut
      ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
          t("cart.whatsappText", {
            from: d(range.checkIn),
            to: d(range.checkOut),
            guests: persons,
          }),
        )}`
      : contact?.whatsapp
        ? `https://wa.me/${contact.whatsapp}`
        : null;
  const initials = (contact?.name ?? data.propertyName)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {data.photos.length > 0 ? (
          <div className="grid h-44 grid-cols-3 grid-rows-2 gap-1 overflow-hidden">
            {data.photos.slice(0, 3).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- public storage images
              <img
                key={i}
                src={p.url}
                alt={p.alt}
                className={cn("size-full min-h-0 object-cover", i === 0 && "col-span-2 row-span-2")}
              />
            ))}
          </div>
        ) : null}
        <CartHeader kicker={t("cart.step1")} />
        <div className="grid gap-6 px-6 pt-2 pb-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {data.propertyName}
          </h2>

          <div className="border-line grid gap-3 rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-0.5">
                <span className="font-medium">
                  {range.checkIn && range.checkOut
                    ? `${d(range.checkIn)} – ${d(range.checkOut)}`
                    : t("cart.selectDates")}
                </span>
                {ready ? (
                  <span className="text-muted-foreground text-sm">
                    {t("cart.nightsGuests", { nights, guests: persons })}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCalendarOpen(!calendarOpen)}
              >
                {t("cart.change")}
              </Button>
            </div>
            {calendarOpen ? (
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
                  if (r.checkIn && r.checkOut) setCalendarOpen(false);
                }}
                months={1}
                stayPrice={b.stayPrice}
              />
            ) : null}
            <div className="border-line grid border-t pt-2">
              <Counter
                label={t("booking.adults")}
                value={adults}
                min={1}
                max={data.catalog.maxGuests - children}
                onChange={b.setAdults}
              />
              <Counter
                label={t("booking.children")}
                value={children}
                min={0}
                max={data.catalog.maxGuests - adults}
                onChange={b.setChildren}
              />
              <Counter
                label={t("booking.infants")}
                value={infants}
                min={0}
                max={4}
                onChange={b.setInfants}
              />
              {data.catalog.petsAllowed ? (
                <Counter
                  label={t("booking.pets")}
                  value={pets}
                  min={0}
                  max={3}
                  onChange={b.setPets}
                />
              ) : null}
            </div>
          </div>

          {ready ? (
            <div className="grid gap-1">
              <p className="kicker text-muted-foreground">{t("booking.total")}</p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{money(total)}</p>
              <p className="text-muted-foreground text-sm">
                {t("cart.perPersonNight", {
                  price: money(
                    Math.round(total / Math.max(1, persons) / Math.max(1, nights || 1)),
                    0,
                  ),
                })}
                {data.catalog.touristTax.included ? ` · ${t("cart.taxIncluded")}` : ""}
              </p>
              <button
                type="button"
                className="text-primary justify-self-start text-sm underline-offset-4 hover:underline"
                onClick={() => setShowLines(!showLines)}
              >
                {showLines ? t("cart.hideBreakdown") : t("cart.breakdown")}
              </button>
              {showLines ? (
                <div className="mt-2">
                  <Breakdown />
                </div>
              ) : null}
            </div>
          ) : price && !price.ok ? (
            <p className="text-sm text-[#b5532f]">{errorsText(t, price)}</p>
          ) : null}

          <ul className="grid gap-2 text-sm">
            {data.trust.map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="text-primary mt-0.5 size-4 shrink-0" /> <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="border-line flex items-center gap-3 rounded-2xl border p-4">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-medium">
              {initials}
            </span>
            <span className="flex-1 text-sm">
              {contact?.name
                ? t("cart.contactTitle", { name: contact.name })
                : t("cart.contactFallback")}
            </span>
            {wa ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle /> {t("cart.whatsapp")}
                </a>
              </Button>
            ) : null}
            {contact?.phone ? (
              <Button
                asChild
                variant="outline"
                size="icon"
                className="rounded-full"
                aria-label={t("cart.call")}
              >
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                  <Phone />
                </a>
              </Button>
            ) : null}
          </div>

          {recommendation && ready ? (
            <div className="flex items-center gap-3">
              {data.services[recommendation.id]?.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- public storage images
                <img
                  src={data.services[recommendation.id]!.image!}
                  alt=""
                  className="size-14 rounded-xl object-cover"
                />
              ) : null}
              <button
                type="button"
                className="grid flex-1 gap-0.5 text-left"
                onClick={() => b.showService(recommendation.id)}
              >
                <span className="kicker text-muted-foreground">{t("cart.forYourDates")}</span>
                <span className="text-sm font-medium">{tr(recommendation.name, data.locale)}</span>
                <span className="text-muted-foreground text-xs">
                  {t("cart.forGroup", {
                    price: money(serviceTotal(recommendation, nights || 0, persons, 1)),
                  })}
                </span>
              </button>
              <Button
                type="button"
                size="sm"
                variant={(b.services[recommendation.id] ?? 0) > 0 ? "secondary" : "outline"}
                className="rounded-full"
                onClick={() =>
                  b.setService(recommendation.id, (b.services[recommendation.id] ?? 0) > 0 ? 0 : 1)
                }
              >
                {(b.services[recommendation.id] ?? 0) > 0 ? t("cart.added") : t("cart.add")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <CartFooter>
        <Button
          type="button"
          size="lg"
          className="rounded-full"
          disabled={!ready}
          onClick={() => b.setStep(2)}
        >
          {t("cart.continue")}
        </Button>
      </CartFooter>
    </div>
  );
}

function StepDetails() {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, money, total, price } = b;
  const f = b.guest;
  const set = (k: keyof GuestFields, v: string) => b.setGuest({ ...f, [k]: v });
  const nights = price?.ok ? price.nights : 0;
  const persons = b.adults + b.children;
  const valid = f.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <CartHeader kicker={t("cart.step2")} onBack={() => b.setStep(1)} />
        <div className="grid gap-8 px-6 pt-3 pb-6">
          <div className="grid gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {t("cart.whoTitle")} <span className="text-ink-soft">{t("cart.whoSub")}</span>
            </h2>
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">{t("booking.name")}</Label>
              <Input
                id="c-name"
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-email">{t("booking.email")}</Label>
              <Input
                id="c-email"
                type="email"
                value={f.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-phone">{t("booking.phone")}</Label>
              <Input
                id="c-phone"
                type="tel"
                value={f.phone}
                onChange={(e) => set("phone", e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          {data.catalog.services.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="font-heading text-xl font-semibold tracking-tight">
                {t("cart.wishesTitle")}{" "}
                <span className="text-ink-soft block text-base font-normal">
                  {t("cart.wishesSub")}
                </span>
              </h3>
              <ul className="divide-line grid divide-y">
                {data.catalog.services.map((s) => {
                  const q = b.services[s.id] ?? 0;
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <button
                        type="button"
                        aria-pressed={q > 0}
                        aria-label={tr(s.name, data.locale)}
                        onClick={() => b.setService(s.id, q > 0 ? 0 : 1)}
                        className="text-primary"
                      >
                        {q > 0 ? (
                          <CircleCheck className="size-6" />
                        ) : (
                          <Circle className="text-muted-foreground size-6" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="grid flex-1 gap-0.5 text-left"
                        onClick={() => b.showService(s.id)}
                      >
                        <span className="text-sm font-medium">{tr(s.name, data.locale)}</span>
                        <span className="text-muted-foreground text-xs">
                          {t("cart.forStay", {
                            price: money(serviceTotal(s, nights, persons, Math.max(1, q))),
                          })}
                        </span>
                      </button>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="c-note">{t("booking.note")}</Label>
            <Textarea
              id="c-note"
              rows={3}
              value={f.note}
              onChange={(e) => set("note", e.target.value)}
              maxLength={2000}
            />
            <p className="text-muted-foreground text-xs">{t("booking.noteHint")}</p>
          </div>
        </div>
      </div>
      <CartFooter>
        <div className="flex items-baseline justify-between">
          <span className="font-medium">{t("booking.total")}</span>
          <span className="text-xl font-semibold tabular-nums">{money(total)}</span>
        </div>
        <Button
          type="button"
          size="lg"
          className="rounded-full"
          disabled={!valid}
          onClick={() => b.setStep(3)}
        >
          {t("cart.toPayment")}
        </Button>
      </CartFooter>
    </div>
  );
}

function ServiceDetail() {
  const t = useTranslations("guest");
  const tm = useTranslations("priceModels");
  const b = useBooking();
  const { data, money, price } = b;
  const s = data.catalog.services.find((x) => x.id === b.detailId);
  const [items, setItems] = useState(Math.max(1, b.services[s?.id ?? ""] ?? 1));
  if (!s) return null;
  const extra = data.services[s.id];
  const chosen = (b.services[s.id] ?? 0) > 0;
  const perItem = s.priceModel === "per_item";
  const nights = price?.ok ? price.nights : 0;
  const lines = (extra?.description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const back = () => b.setStep(2);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {extra?.image || data.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- public storage images
          <img
            src={extra?.image ?? data.photos[0]!.url}
            alt=""
            className="h-56 w-full object-cover"
          />
        ) : null}
        <CartHeader kicker={tm(s.priceModel)} onBack={back} />
        <div className="grid gap-4 px-6 pt-2 pb-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {tr(s.name, data.locale)}
          </h2>
          <p className="text-lg">
            {money(s.amountCents)}{" "}
            <span className="text-muted-foreground text-sm">{tm(s.priceModel)}</span>
          </p>
          {lines.length > 0 ? (
            <ul className="grid gap-2 text-sm">
              {lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />{" "}
                  <span>{l.replace(/^[-•]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {perItem ? (
            <Counter
              label={t("cart.trips")}
              value={items}
              min={1}
              max={s.maxQuantity ?? 10}
              onChange={setItems}
            />
          ) : null}
        </div>
      </div>
      <CartFooter>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {t("cart.forStay", {
              price: money(serviceTotal(s, nights, b.adults + b.children, perItem ? items : 1)),
            })}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          variant={chosen ? "outline" : "default"}
          className="rounded-full"
          onClick={() => {
            b.setService(
              s.id,
              chosen && !perItem
                ? 0
                : chosen && perItem && items === b.services[s.id]
                  ? 0
                  : perItem
                    ? items
                    : 1,
            );
            back();
          }}
        >
          {chosen && (!perItem || items === b.services[s.id])
            ? t("cart.removeFromStay")
            : t("cart.addToStay")}
        </Button>
      </CartFooter>
    </div>
  );
}

const initialState: BookingState = { error: null };

function StepPayment() {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, money, total, range, promo, setPromo, lines } = b;
  const [state, action, pending] = useActionState(createGuestReservation, initialState);
  const { holdId, failed } = useHold();
  const [code, setCode] = useState(promo?.code ?? "");
  const [promoMissing, setPromoMissing] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const deposit = lines.filter((l) => l.kind === "deposit").reduce((s, l) => s + l.amountCents, 0);
  const cancellation = data.settings.cancellationPolicy || t("booking.consentCancellation");

  async function applyPromo() {
    if (!range.checkIn || !range.checkOut) return;
    const r = await previewPromo({
      slug: data.slug,
      unitId: data.unitId,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      adults: b.adults,
      children: b.children,
      code,
    });
    setPromoMissing(!r);
    setPromo(r ? { code: code.trim().toUpperCase(), ...r } : null);
  }

  return (
    <form action={action} className="flex h-full flex-col">
      {(
        [
          ["slug", data.slug],
          ["unit_id", data.unitId],
          ["check_in", range.checkIn ?? ""],
          ["check_out", range.checkOut ?? ""],
          ["adults", b.adults],
          ["children", b.children],
          ["infants", b.infants],
          ["pets", b.pets],
          ["hold_id", holdId],
          ["started_at", startedAt],
          ["promo_code", promo?.code ?? ""],
          ["guest_name", b.guest.name],
          ["guest_email", b.guest.email],
          ["guest_phone", b.guest.phone],
          ["guest_country", b.guest.country],
          ["guest_note", b.guest.note],
          ["consent_terms_text", t("booking.consentTerms")],
          ["consent_cancellation_text", cancellation],
          ["privacy_text", t("booking.privacy")],
          ["consent_marketing_text", t("booking.consentMarketing")],
        ] as const
      ).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      {Object.entries(b.services).map(([id, q]) =>
        q > 0 ? <input key={id} type="hidden" name={`service_${id}`} value={q} /> : null,
      )}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <CartHeader kicker={t("cart.step3")} onBack={() => b.setStep(2)} />
        <div className="grid gap-6 px-6 pt-3 pb-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {t("cart.payTitle")}
          </h2>
          {failed ? <p className="text-sm text-[#b5532f]">{t("booking.takenNow")}</p> : null}
          <Breakdown />
          <div className="border-line flex items-baseline justify-between border-t pt-3">
            <span className="font-medium">{t("booking.total")}</span>
            <span className="text-2xl font-semibold tabular-nums">{money(total)}</span>
          </div>
          {deposit > 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("booking.deposit")}: {money(deposit)}
            </p>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="c-promo">{t("booking.promo")}</Label>
            <div className="flex gap-2">
              <Input
                id="c-promo"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setPromoMissing(false);
                }}
                className="uppercase"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!code.trim()}
                onClick={applyPromo}
              >
                {t("booking.promoApply")}
              </Button>
            </div>
            {promoMissing ? (
              <p className="text-muted-foreground text-xs">{t("booking.promoNotApplicable")}</p>
            ) : null}
          </div>

          <div className="grid gap-3">
            <Label className="items-start font-normal">
              <Checkbox name="consent_terms" required className="mt-0.5" />
              <span>
                {data.settings.termsUrl ? (
                  <a
                    href={data.settings.termsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {t("booking.consentTerms")}
                  </a>
                ) : (
                  t("booking.consentTerms")
                )}
              </span>
            </Label>
            <Label className="items-start font-normal">
              <Checkbox name="consent_cancellation" required className="mt-0.5" />
              <span>
                {t("booking.consentCancellation")}
                {data.settings.cancellationPolicy ? (
                  <span className="text-muted-foreground block text-xs">
                    {data.settings.cancellationPolicy}
                  </span>
                ) : null}
              </span>
            </Label>
            <Label className="items-start font-normal">
              <Checkbox name="consent_marketing" className="mt-0.5" />
              <span>{t("booking.consentMarketing")}</span>
            </Label>
            <p className="text-muted-foreground text-xs">
              {data.settings.privacyUrl ? (
                <a
                  href={data.settings.privacyUrl}
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
          </div>
        </div>
      </div>
      <CartFooter>
        {state.error ? (
          <p role="alert" className="text-sm text-[#b5532f]">
            {t(`booking.errors.${state.error}`)}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="rounded-full" disabled={pending || failed}>
          {pending ? t("booking.submitting") : t("booking.submit")}
        </Button>
        <p className="text-muted-foreground text-xs">
          {t("booking.payNote", { hours: data.settings.paymentDueHours })}
          {holdId ? ` ${t("booking.held", { minutes: data.settings.holdMinutes })}` : ""}
        </p>
      </CartFooter>
    </form>
  );
}
