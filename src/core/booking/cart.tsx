"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilityCalendar } from "@/core/booking/availability-calendar";
import {
  createGuestReservation,
  holdTerm,
  previewPromo,
  startBookingForm,
  type BookingState,
} from "@/core/booking/create";
import { tr } from "@/core/i18n/localized";
import { Captcha, captchaEnabled } from "@/core/security/captcha";
import type { Service } from "@/core/pricing/types";
import type { PaymentMethodKey } from "@/core/payments/methods";
import { cn } from "@/lib/utils";
import {
  Counter,
  TestimonialCarousel,
  errorsText,
  serviceTotal,
  useBooking,
  useDates,
  usePriceBlock,
  billingValid,
  type BillingFields,
  type GuestFields,
} from "./guest-booking";

const FORM_ID = "booking-form";

/** Stay in the summary without wrapping (Z30): "24. – 26. 11. 2026", "29. 11. – 2. 12. 2026", full dates across years. */
function shortRange(checkIn: string, checkOut: string, locale: string): string {
  const [y1, m1, d1] = checkIn.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = checkOut.split("-").map(Number) as [number, number, number];
  if (!locale.startsWith("sk") && !locale.startsWith("cs")) {
    const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" });
    return fmt.formatRange(new Date(`${checkIn}T00:00:00Z`), new Date(`${checkOut}T00:00:00Z`));
  }
  if (y1 !== y2) return `${d1}. ${m1}. ${y1} – ${d2}. ${m2}. ${y2}`;
  if (m1 !== m2) return `${d1}. ${m1}. – ${d2}. ${m2}. ${y2}`;
  return `${d1}. – ${d2}. ${m2}. ${y2}`;
}

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True on a wide screen (two calendar months, summary column). */
function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function useHold(enabled: boolean) {
  const { data, range } = useBooking();
  const [holdId, setHoldId] = useState("");
  const [failed, setFailed] = useState(false);
  const requested = useRef("");
  useEffect(() => {
    if (!enabled || !range.checkIn || !range.checkOut) return;
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
  }, [enabled, data.unitId, range.checkIn, range.checkOut]);
  return { holdId, failed };
}

const initialState: BookingState = { error: null };

/**
 * Cart v2.2 (side panel up to 1040 px, tuned for a 13″ notebook): steps on the left, the green summary (320 px) on
 * the right fits without scrolling — what I buy and for how much, with the button and one line of reassurance at the
 * bottom. Phones: full screen, green bar at the bottom with the breakdown sliding up.
 */
export function Cart() {
  const t = useTranslations("guest");
  const b = useBooking();
  const wide = useWide();
  const [state, action, pending] = useActionState(createGuestReservation, initialState);
  const { holdId, failed } = useHold(b.open && b.step === 3);
  const [formToken, setFormToken] = useState("");
  const [sheet, setSheet] = useState(false);
  // Turnstile token (valid once): a new one after every promo check and every refused submit.
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.error) setCaptchaReset((n) => n + 1);
  }
  useEffect(() => {
    if (b.open && b.step === 3 && !formToken) void startBookingForm().then(setFormToken);
  }, [b.open, b.step, formToken]);

  const ready = Boolean(b.price?.ok);
  const hasDates = Boolean(b.range.checkIn && b.range.checkOut);
  const calendarOpen = b.cartCalendar || !hasDates;
  const f = b.guest;
  const contactValid =
    f.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && billingValid(b.billing);
  // Z30: without a valid stay the reason is always written above the button (arrival → departure → price rules).
  const reason =
    b.step === 1 && !ready
      ? !b.range.checkIn
        ? t("v2.pickArrival")
        : !b.range.checkOut
          ? t("v2.pickDeparture")
          : (errorsText(t, b.price) ?? t("v2.pickDeparture"))
      : null;
  const [flash, setFlash] = useState(0);
  const cta =
    b.step === 1
      ? {
          label: t("cart.continue"),
          // A valid stay is enough: with the calendar open, Pokračovať confirms the dates and shows the extras.
          blocked: !ready,
          onClick: () => {
            if (!ready) {
              setFlash((n) => n + 1);
              document
                .getElementById("cart-calendar")
                ?.scrollIntoView({ block: "center", behavior: "smooth" });
              return;
            }
            if (calendarOpen) b.setCartCalendar(false);
            else b.setStep(2);
          },
        }
      : b.step === 2
        ? {
            label: t("cart.toPayment"),
            disabled: !ready || !contactValid,
            onClick: () => b.setStep(3),
          }
        : {
            label: pending ? t("booking.submitting") : t("booking.submit"),
            disabled: pending || failed || !formToken || !ready || (captchaEnabled && !captcha),
            submit: true,
          };
  const ctaButton = (reasonId?: string) => (
    <button
      type={cta.submit ? "submit" : "button"}
      form={cta.submit ? FORM_ID : undefined}
      disabled={"disabled" in cta ? cta.disabled : undefined}
      // Muted but clickable (aria-disabled): the click points to the reason and the calendar.
      aria-disabled={"blocked" in cta && cta.blocked ? true : undefined}
      aria-describedby={reason && reasonId ? reasonId : undefined}
      onClick={cta.submit ? undefined : cta.onClick}
      className={cn(
        "btn-on-accent inline-flex min-h-12 w-full items-center justify-center gap-2.5 px-5 text-center",
        "blocked" in cta && cta.blocked && "cursor-not-allowed opacity-55",
      )}
    >
      {cta.label} {cta.submit ? null : <ChevronRight className="size-4 shrink-0" />}
    </button>
  );
  const reasonLine = (id: string, className?: string) =>
    reason ? (
      <p
        id={id}
        key={`${id}-${flash}`}
        role="status"
        className={cn(
          "text-[13px] text-white",
          flash > 0 && "font-bold motion-safe:animate-[pulse_0.6s_ease-in-out_2]",
          className,
        )}
      >
        {reason}
      </p>
    ) : null;

  return (
    <Sheet open={b.open} onOpenChange={(o) => !o && b.closeCart()}>
      <SheetContent
        side="right"
        className="border-line gap-0 rounded-none border-l p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-full data-[side=right]:lg:max-w-[1040px] [&>button]:hidden"
      >
        <SheetTitle className="sr-only">{t("cart.step1")}</SheetTitle>
        <CartHeader />
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto px-5 pt-6 pb-32 sm:px-10 sm:pt-7 lg:pb-10">
            {b.step === 1 ? (
              <StepStay wide={wide} calendarOpen={calendarOpen} />
            ) : b.step === 2 ? (
              <StepDetails />
            ) : (
              <StepPayment
                action={action}
                state={state}
                holdId={holdId}
                failed={failed}
                formToken={formToken}
                captcha={captcha}
                onCaptcha={setCaptcha}
                captchaReset={captchaReset}
                renewCaptcha={() => setCaptchaReset((n) => n + 1)}
              />
            )}
          </div>
          <aside className="bg-surface-accent hidden w-[320px] shrink-0 flex-col text-white lg:flex">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-5 pb-4">
              <Summary />
            </div>
            <div className="grid shrink-0 gap-2.5 border-t border-white/18 px-6 pt-3.5 pb-4">
              {b.step > 1 ? (
                <button
                  type="button"
                  onClick={() => b.setStep(b.step === 3 ? 2 : 1)}
                  className="text-on-accent-soft justify-self-start text-[13px] font-medium hover:text-white"
                >
                  ← {b.step === 2 ? t("v2.backToStayShort") : t("v2.backToDetails")}
                </button>
              ) : null}
              {reasonLine("cart-reason")}
              {ctaButton("cart-reason")}
              {/* Z71: on the payment step the cancellation is said once, at its checkbox. */}
              {b.data.trust[0] && b.step !== 3 ? (
                <p className="text-on-accent-soft inline-flex items-start gap-1.5 text-xs break-words">
                  <Check className="mt-px size-3.5 shrink-0" aria-hidden /> {b.data.trust[0]}
                </p>
              ) : null}
            </div>
          </aside>
        </div>

        {/* Phones: green bar with the sum; the breakdown slides up from the bottom. */}
        <div className="lg:hidden">
          {sheet ? (
            <div className="bg-surface-accent absolute inset-x-0 bottom-[76px] z-10 grid max-h-[70svh] gap-5 overflow-y-auto rounded-t-lg px-5 pt-5 pb-6 text-white shadow-[0_-24px_60px_-30px_rgba(17,33,47,0.5)]">
              <Summary compact />
            </div>
          ) : null}
          {reason ? (
            <div className="bg-accent-deep absolute inset-x-0 bottom-[72px] z-20 px-5 py-2">
              {reasonLine("cart-reason-mobile")}
            </div>
          ) : null}
          <div className="bg-surface-accent absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-5 py-3 text-white">
            <button
              type="button"
              aria-expanded={sheet}
              onClick={() => setSheet(!sheet)}
              className="grid min-w-0 flex-1 text-left"
            >
              <span className="text-lg font-extrabold tabular-nums">
                {ready ? b.money(b.total) : "—"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-white/80">
                {t("v2.breakdownTerms")}
                {sheet ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </span>
            </button>
            <div className="w-[52%] shrink-0">{ctaButton("cart-reason-mobile")}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Step bar (v2.2, 52 px): numbers 22 px joined by short lines; a finished step has a tick and leads back. */
function CartHeader() {
  const t = useTranslations("guest");
  const b = useBooking();
  const steps = [t("v2.step1"), t("v2.step2"), t("v2.step3")];
  return (
    <div className="border-line flex min-h-[52px] shrink-0 items-center justify-between gap-4 border-b px-5 py-2 sm:px-8">
      <ol className="hidden items-center gap-3 lg:flex">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = b.step === n;
          const done = b.step > n;
          const inner = (
            <>
              <span
                className={cn(
                  "inline-flex size-[22px] items-center justify-center rounded-full text-[12px] font-bold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : n}
              </span>
              <span
                className={cn(
                  "text-[13px]",
                  active ? "text-ink font-bold" : done ? "text-ink" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </>
          );
          return (
            <li
              key={label}
              className="inline-flex items-center gap-3"
              aria-current={active ? "step" : undefined}
            >
              {i > 0 ? <span aria-hidden className="bg-line h-px w-6" /> : null}
              {done ? (
                <button
                  type="button"
                  onClick={() => {
                    b.setStep(n as 1 | 2 | 3);
                    b.setCartCalendar(false);
                  }}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full hover:underline"
                >
                  {inner}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2">{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="grid gap-1.5 lg:hidden">
        <span className="text-ink text-sm font-medium">
          {t("v2.stepOf", { step: b.step, label: steps[b.step - 1]! })}
        </span>
        <span className="flex gap-1" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn("h-1 w-8 rounded-full", n <= b.step ? "bg-primary" : "bg-line")}
            />
          ))}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="border-line size-[34px] rounded-full"
        onClick={b.closeCart}
        aria-label={t("cart.close")}
      >
        <X />
      </Button>
    </div>
  );
}

function SectionTitle({
  title,
  sub,
  size = "lg",
}: {
  title: string;
  sub?: string;
  size?: "lg" | "md";
}) {
  return (
    <h2
      className={cn(
        "font-heading text-ink font-extrabold tracking-tight",
        size === "lg" ? "text-[26px] leading-tight sm:text-[30px]" : "text-2xl sm:text-[26px]",
      )}
    >
      {title} {sub ? <span className="text-ink-soft">{sub}</span> : null}
    </h2>
  );
}

function BackPill({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink inline-flex min-h-10 items-center gap-2 justify-self-start rounded-full bg-[#f7f4ed] py-0 pr-3.5 pl-2.5 text-sm font-medium"
    >
      <ArrowLeft className="size-4" /> {children}
    </button>
  );
}

// ------------------------------------------------------------------------------------------- step 1

function StepStay({ wide, calendarOpen }: { wide: boolean; calendarOpen: boolean }) {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, range } = b;
  const hasDates = Boolean(range.checkIn && range.checkOut);
  const guests = (
    <div className="guest-card rounded-lg px-4 py-2 lg:hidden">
      <Guests />
    </div>
  );

  // No dates yet, or "Zmeniť": the calendar on the left, extras wait until it is closed with a valid stay.
  if (calendarOpen) {
    return (
      <section className="grid gap-[18px]">
        <SectionTitle title={t("v2.cartDatesTitle")} sub={t("v2.cartDatesSub")} />
        <div id="cart-calendar" className="guest-card rounded-lg px-4 py-5 sm:px-6">
          <AvailabilityCalendar
            locale={data.locale}
            currency={data.catalog.currency}
            seasons={data.catalog.seasons}
            rates={data.catalog.rates}
            discounts={data.catalog.discounts}
            busy={data.busy}
            today={data.today}
            value={range}
            // The calendar stays open after choosing (arrival, departure and the nights between stay visible);
            // the guest closes it with "Hotovo".
            onChange={b.setRange}
            months={wide ? 2 : 1}
            stayPrice={b.stayPrice}
          />
        </div>
        {b.price && !b.price.ok ? (
          <p className="text-sm text-[#b5532f]">{errorsText(t, b.price)}</p>
        ) : null}
        <Button
          type="button"
          className="justify-self-start rounded-full px-6 font-bold"
          disabled={!hasDates || !b.price?.ok}
          onClick={() => b.setCartCalendar(false)}
        >
          {t("v2.confirmDates")}
        </Button>
        {guests}
      </section>
    );
  }

  return (
    <div className="grid gap-8">
      {guests}
      <Extras />
      {data.testimonials.length > 0 ? (
        <div className="rounded-lg bg-[#f4f3ef] px-5 py-4">
          <TestimonialCarousel />
        </div>
      ) : null}
    </div>
  );
}

function Guests({ tone = "light" }: { tone?: "light" | "accent" }) {
  const t = useTranslations("guest");
  const b = useBooking();
  const [more, setMore] = useState(b.children + b.infants + b.pets > 0);
  const max = b.data.catalog.maxGuests;
  return (
    <div className="grid">
      <Counter
        tone={tone}
        label={t("booking.adults")}
        value={b.adults}
        min={1}
        max={max - b.children}
        onChange={b.setAdults}
      />
      {more ? (
        <>
          <Counter
            tone={tone}
            label={t("booking.children")}
            value={b.children}
            min={0}
            max={max - b.adults}
            onChange={b.setChildren}
          />
          <Counter
            tone={tone}
            label={t("booking.infants")}
            value={b.infants}
            min={0}
            max={4}
            onChange={b.setInfants}
          />
          {b.data.catalog.petsAllowed ? (
            <Counter
              tone={tone}
              label={t("booking.pets")}
              value={b.pets}
              min={0}
              max={3}
              onChange={b.setPets}
            />
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            "justify-self-start py-1 text-[13px] underline underline-offset-4",
            tone === "accent" ? "text-white/95" : "text-muted-foreground",
          )}
        >
          {t("v2.childrenPets")}
        </button>
      )}
    </div>
  );
}

/** Extras as one-line rows (v2.2, ~54 px): circle to add, name, price model, sum for the stay; a click opens one row in place. */
function Extras() {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data } = b;
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const list = data.catalog.services;
  if (list.length === 0) return null;
  const visible = list.length > 6 && !showAll ? list.slice(0, 5) : list;
  return (
    <section className="grid gap-4">
      <div className="grid gap-1.5">
        <SectionTitle title={t("v2.extrasTitle")} sub={t("v2.extrasSub")} />
        <span className="text-muted-foreground text-sm">
          {data.contact?.name
            ? t("v2.extrasHint", { name: data.contact.name })
            : t("v2.extrasHintFallback")}
        </span>
      </div>
      <ul className="border-line border-t">
        {visible.map((s) => (
          <ExtraRow
            key={s.id}
            s={s}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
          />
        ))}
      </ul>
      {list.length > 6 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-ink justify-self-start text-sm font-medium underline underline-offset-4"
        >
          {t("v2.showMore", { count: list.length - 5 })}
        </button>
      ) : null}
    </section>
  );
}

function ExtraRow({ s, open, onToggle }: { s: Service; open: boolean; onToggle: () => void }) {
  const t = useTranslations("guest");
  const tm = useTranslations("priceModels");
  const b = useBooking();
  const { data, money } = b;
  const q = b.services[s.id] ?? 0;
  const on = q > 0;
  const perItem = s.priceModel === "per_item";
  const [items, setItems] = useState(Math.max(1, q || 1));
  const nights = b.price?.ok ? b.price.nights : 0;
  const persons = b.adults + b.children;
  const extra = data.services[s.id];
  const image = extra?.image ?? null;
  const [first, ...rest] = (extra?.description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const forGroups = s.priceModel === "per_person" || s.priceModel === "per_person_night";
  const sum = serviceTotal(s, nights || 1, persons, perItem ? items : 1);
  const name = tr(s.name, data.locale);
  const panelId = `extra-${s.id}`;
  return (
    <li className={cn("border-line border-b", open && "bg-[#f7f6f2]")}>
      <div className="flex min-h-[54px] items-center gap-3 py-2 pr-1">
        <button
          type="button"
          aria-pressed={on}
          aria-label={name}
          onClick={() => b.setService(s.id, on ? 0 : perItem ? items : 1)}
          className={cn(
            "ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
            on ? "border-primary bg-primary text-primary-foreground" : "border-[#c9cdc8]",
          )}
        >
          {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left sm:flex-row sm:items-baseline sm:gap-2.5"
        >
          <span className="text-ink truncate text-[15px] font-medium">{name}</span>
          <span className="text-muted-foreground truncate text-[13px]">{tm(s.priceModel)}</span>
        </button>
        <span className="text-ink text-sm font-medium whitespace-nowrap tabular-nums">
          {nights ? `${on ? "" : "+ "}${money(sum)}` : money(s.amountCents)}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t("v2.showMoreAbout", { name })}
          className="text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div id={panelId} className="flex flex-wrap gap-5 px-1 pb-5 sm:pl-10">
          {image ? (
            <div className="relative h-[100px] w-[150px] shrink-0 overflow-hidden rounded-lg">
              <Image src={image} alt="" fill sizes="150px" className="object-cover" />
            </div>
          ) : null}
          <div className="grid min-w-0 flex-[1_1_260px] content-start gap-3">
            {forGroups ? (
              <span className="text-accent-2 font-mono text-[10px] font-medium tracking-widest uppercase">
                {t("v2.forGroups")}
              </span>
            ) : null}
            {first ? <p className="text-muted-foreground leading-relaxed">{first}</p> : null}
            {rest.length > 0 ? (
              <ul className="grid gap-1.5">
                {rest.map((l) => (
                  <li key={l} className="inline-flex items-center gap-2 text-sm">
                    <Check className="text-primary size-4" /> {l.replace(/^[-•]\s*/, "")}
                  </li>
                ))}
              </ul>
            ) : null}
            {perItem ? (
              <div className="w-56">
                <Counter
                  label={t("cart.trips")}
                  value={items}
                  min={1}
                  max={s.maxQuantity ?? 10}
                  onChange={(v) => {
                    setItems(v);
                    if (on) b.setService(s.id, v);
                  }}
                />
              </div>
            ) : null}
            <Button
              type="button"
              variant={on ? "outline" : "default"}
              className="justify-self-start rounded-full"
              onClick={() => b.setService(s.id, on ? 0 : perItem ? items : 1)}
            >
              {on ? t("cart.removeFromStay") : t("v2.addToStayPrice", { price: money(sum) })}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

// ------------------------------------------------------------------------------------------- step 2

/** "Chcem faktúru na firmu" (Z71): unfolds the company; IČ DPH optional. The address of a guest is not asked. */
function InvoiceFields() {
  const t = useTranslations("guest");
  const { billing, setBilling } = useBooking();
  const set = (k: Exclude<keyof BillingFields, "on">, v: string) =>
    setBilling({ ...billing, [k]: v });
  const field = "border-line min-h-12 rounded-lg px-3.5 text-[15px]";
  const input = (k: Exclude<keyof BillingFields, "on">, label: string, wide = false, max = 20) => (
    <div className={cn("grid gap-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={`c-${k}`}>{label}</Label>
      <Input
        id={`c-${k}`}
        className={field}
        value={billing[k]}
        maxLength={max}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );
  return (
    <div className="grid gap-4">
      <Label className="items-start font-normal">
        <Checkbox
          checked={billing.on}
          onCheckedChange={(v) => setBilling({ ...billing, on: v === true })}
          className="mt-0.5"
        />
        <span>{t("cart.invoice")}</span>
      </Label>
      {billing.on ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="text-muted-foreground text-sm sm:col-span-2">{t("cart.invoiceHint")}</p>
          {input("company", t("cart.company"), true, 200)}
          {input("companyId", t("cart.companyId"))}
          {input("taxId", t("cart.taxId"))}
          {input("vatId", t("cart.vatId"))}
          <div className="hidden sm:block" />
          {input("address", t("cart.companyAddress"), true, 300)}
        </div>
      ) : null}
    </div>
  );
}

function StepDetails() {
  const t = useTranslations("guest");
  const b = useBooking();
  const f = b.guest;
  const set = (k: keyof GuestFields, v: string) => b.setGuest({ ...f, [k]: v });
  const chosen = b.data.catalog.services.filter((s) => (b.services[s.id] ?? 0) > 0);
  const field = "border-line min-h-12 rounded-lg px-3.5 text-[15px]";
  return (
    <div className="grid max-w-[620px] gap-7">
      <div className="lg:hidden">
        <BackPill onClick={() => b.setStep(1)}>{t("v2.backToStay")}</BackPill>
      </div>
      <SectionTitle title={t("cart.whoTitle")} sub={t("cart.whoSub")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="c-name">{t("booking.name")}</Label>
          <Input
            id="c-name"
            className={field}
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
            className={field}
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
            className={field}
            value={f.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="c-note">{t("booking.note")}</Label>
          <Textarea
            id="c-note"
            rows={4}
            className="border-line rounded-lg text-[15px]"
            value={f.note}
            placeholder={t("booking.noteHint")}
            onChange={(e) => set("note", e.target.value)}
            maxLength={2000}
          />
        </div>
      </div>
      {/* Z71: the stay is in the account too — sign-in by e-mail, never a password here. */}
      <p className="text-muted-foreground -mt-3 text-sm">{t("cart.accountNote")}</p>
      <InvoiceFields />
      <AskOwner />
      {b.data.catalog.services.length > 0 ? (
        <div className="border-line grid gap-2.5 border-t pt-[18px] lg:hidden">
          <span className="kicker text-muted-foreground text-[11px]">{t("v2.yourExtras")}</span>
          <span className="text-ink text-[15px]">
            {chosen.length > 0
              ? chosen.map((s) => tr(s.name, b.data.locale)).join(", ")
              : t("v2.noExtras")}
          </span>
          <button
            type="button"
            onClick={() => b.setStep(1)}
            className="text-ink justify-self-start text-sm font-medium underline underline-offset-[3px]"
          >
            {t("v2.editExtras")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------- step 3

/**
 * Spôsob platby (Z71, ROZHODNUTIA 2026-10-20): cards of the ways the owner switched on, the transfer with QR first;
 * a prepared way (card) only as an inactive "Pripravujeme" card — and only on staging (`upcomingMethods`).
 */
function PaymentChoice({
  offered,
  upcoming,
  value,
  onChange,
  hours,
}: {
  offered: PaymentMethodKey[];
  upcoming: PaymentMethodKey[];
  value: PaymentMethodKey;
  onChange: (m: PaymentMethodKey) => void;
  hours: number;
}) {
  const t = useTranslations("guest.cart");
  const all = [
    ...offered.map((m) => ({ m, on: true })),
    ...upcoming.map((m) => ({ m, on: false })),
  ];
  if (!all.length) return null;
  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-ink mb-2.5 text-sm font-bold">{t("payChoose")}</legend>
      {all.map(({ m, on }) => (
        <label
          key={m}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3.5 transition-colors",
            !on
              ? "border-line bg-muted cursor-not-allowed text-[#5a6672]"
              : value === m
                ? "border-primary bg-primary/5 cursor-pointer"
                : "border-line cursor-pointer hover:border-[#c9c5ba]",
          )}
        >
          <input
            type="radio"
            name="payment_choice"
            value={m}
            checked={on && value === m}
            disabled={!on}
            onChange={() => onChange(m)}
            className="accent-primary mt-1 size-4 shrink-0"
          />
          <span className="grid gap-0.5">
            <span className="text-ink flex flex-wrap items-center gap-2 text-[15px] font-bold">
              {t(`method.${m}.title`)}
              {!on ? (
                <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[11px] font-bold text-[#3b4652]">
                  {t("method.soon")}
                </span>
              ) : null}
            </span>
            <span className="text-sm">{t(`method.${m}.text`, { hours })}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function StepPayment({
  action,
  state,
  holdId,
  failed,
  formToken,
  captcha,
  onCaptcha,
  captchaReset,
  renewCaptcha,
}: {
  action: (form: FormData) => void;
  state: BookingState;
  holdId: string;
  failed: boolean;
  formToken: string;
  captcha: string;
  onCaptcha: (token: string) => void;
  captchaReset: number;
  renewCaptcha: () => void;
}) {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, money, total, range, promo, setPromo, lines, billing } = b;
  const [code, setCode] = useState(promo?.code ?? "");
  const [promoOpen, setPromoOpen] = useState(false);
  const [method, setMethod] = useState(data.settings.paymentMethods[0] ?? "bank_transfer");
  const [promoError, setPromoError] = useState<null | "none" | "captcha" | "limit">(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
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
      captchaToken: captcha,
    });
    renewCaptcha(); // the token was used up by this check
    setPromoError(r.ok ? null : r.error);
    if (r.ok)
      setPromo({ code: code.trim().toUpperCase(), name: r.name, amountCents: r.amountCents });
    else if (r.error === "none") setPromo(null);
  }

  return (
    <form id={FORM_ID} action={action} className="grid max-w-[640px] gap-7">
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
          ["form_token", formToken],
          ["captcha_token", captcha],
          ["promo_code", promo?.code ?? ""],
          ["guest_name", b.guest.name],
          ["guest_email", b.guest.email],
          ["guest_phone", b.guest.phone],
          ["guest_country", b.guest.country],
          ["guest_note", b.guest.note],
          ["consent_terms_text", t("booking.consentTerms")],
          ["consent_cancellation_text", cancellation],
          ["privacy_text", t("booking.privacy")],
          ["consent_marketing_text", t("booking.consentMarketing", { name: data.propertyName })],
          ["payment_method", method],
          ["invoice", billing.on ? "1" : ""],
          ["billing_company", billing.on ? billing.company : ""],
          ["billing_company_id", billing.on ? billing.companyId : ""],
          ["billing_tax_id", billing.on ? billing.taxId : ""],
          ["billing_vat_id", billing.on ? billing.vatId : ""],
          ["billing_address", billing.on ? billing.address : ""],
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

      <div className="lg:hidden">
        <BackPill onClick={() => b.setStep(2)}>{t("cart.back")}</BackPill>
      </div>
      <SectionTitle title={t("cart.payTitle")} sub={t("cart.paySub")} />
      {/* Z71: 30 minutes = the term is held while the guest finishes; the deadline of the payment is at the method. */}
      {holdId ? (
        <p className="text-ink -mt-3 text-sm">
          {t("cart.holdLine", { minutes: data.settings.holdMinutes })}
        </p>
      ) : null}
      <PaymentChoice
        offered={data.settings.paymentMethods}
        upcoming={data.settings.upcomingMethods}
        value={method}
        onChange={setMethod}
        hours={data.settings.paymentDueHours}
      />
      {failed ? <p className="text-sm text-[#b5532f]">{t("booking.takenNow")}</p> : null}
      {/* The summary on the right has the breakdown; phones see it here. */}
      <dl className="grid gap-2 text-sm lg:hidden">
        {lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {l.labelKey === "touristTax" ? t("touristTax") : tr(l.name, data.locale)}
              {l.kind === "accommodation" ? ` · ${l.quantity} × ${money(l.unitAmountCents)}` : ""}
            </dt>
            <dd className="tabular-nums">{money(l.amountCents)}</dd>
          </div>
        ))}
        <div className="border-line flex items-baseline justify-between border-t pt-3">
          <dt className="text-ink font-medium">{t("booking.total")}</dt>
          <dd className="text-ink text-2xl font-extrabold tabular-nums">{money(total)}</dd>
        </div>
      </dl>
      {deposit > 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("booking.deposit")}: {money(deposit)}
        </p>
      ) : null}

      {/* Z71: the code field only on request; an applied code is one folded row. */}
      {promo ? (
        <p className="text-ink flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" role="status">
          <span>
            {t("cart.promoApplied", { code: promo.code, amount: money(promo.amountCents) })}
          </span>
          <Check className="text-primary size-4" aria-hidden />
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              setPromo(null);
              setCode("");
              setPromoOpen(false);
            }}
            className="font-medium underline underline-offset-[3px]"
          >
            {t("cart.promoRemove")}
          </button>
        </p>
      ) : !promoOpen ? (
        <button
          type="button"
          onClick={() => setPromoOpen(true)}
          aria-expanded={false}
          className="text-ink justify-self-start text-sm font-medium underline underline-offset-[3px]"
        >
          {t("cart.promoLink")}
        </button>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="c-promo">{t("booking.promo")}</Label>
          <div className="flex gap-2">
            <Input
              id="c-promo"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPromoError(null);
              }}
              className="border-line min-h-11 rounded-lg uppercase"
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full"
              disabled={!code.trim() || (captchaEnabled && !captcha)}
              onClick={applyPromo}
            >
              {t("booking.promoApply")}
            </Button>
          </div>
          {promoError ? (
            <p className="text-muted-foreground text-xs">
              {promoError === "none"
                ? t("booking.promoNotApplicable")
                : t(`booking.errors.${promoError}`)}
            </p>
          ) : null}
        </div>
      )}

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
          <span>{t("booking.consentMarketing", { name: data.propertyName })}</span>
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
      <Captcha
        onToken={(token) => {
          onCaptcha(token);
          if (token) setCaptchaFailed(false);
        }}
        onFail={() => setCaptchaFailed(true)}
        resetKey={captchaReset}
      />
      {captchaFailed ? (
        <p role="alert" className="text-sm text-[#b5532f]">
          {t("booking.captchaFailed")}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-[#b5532f]">
          {t(`booking.errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}

// ------------------------------------------------------------------------------------------- green summary

function Summary({ compact }: { compact?: boolean }) {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, range, lines, money } = b;
  const d = useDates();
  const block = usePriceBlock();
  const [showLines, setShowLines] = useState(false);
  const nights = b.price?.ok ? b.price.nights : 0;
  const chosen = lines.filter((l) => l.kind === "service");
  const contact = data.contact;
  const wa = contact?.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}${
        range.checkIn && range.checkOut
          ? `?text=${encodeURIComponent(
              t("cart.whatsappText", {
                from: d.long(range.checkIn),
                to: d.long(range.checkOut),
                guests: b.adults + b.children,
              }),
            )}`
          : ""
      }`
    : null;
  const initials = (contact?.name ?? data.propertyName)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const label = "font-mono text-[11px] font-medium tracking-[0.1em] uppercase text-on-accent-muted";

  return (
    <>
      {/* 1 · Where: quiet kicker, name in white */}
      {!compact ? (
        <div className="grid gap-1">
          {data.propertyCity ? (
            <span className="kicker kicker-sans text-on-accent-muted text-xs">
              {data.propertyCity}
            </span>
          ) : null}
          <span className="text-xl font-extrabold tracking-tight text-white">
            {data.propertyName}
          </span>
        </div>
      ) : null}

      {/* 2 · When and who: the stay as a card */}
      {!compact ? (
        <div className="rounded-lg border border-white/25 bg-white/12">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="grid gap-0.5">
              <span className="text-[15px] font-bold text-white">
                {range.checkIn && range.checkOut
                  ? shortRange(range.checkIn, range.checkOut, data.locale)
                  : t("cart.selectDates")}
              </span>
              {nights ? (
                <span className="text-on-accent-soft text-[13px]">
                  {t("cart.nightsGuests", { nights, guests: b.adults + b.children })}
                </span>
              ) : null}
            </div>
            {range.checkIn && range.checkOut && !(b.step === 1 && b.cartCalendar) ? (
              <button
                type="button"
                onClick={() => {
                  b.setStep(1);
                  b.setCartCalendar(true);
                }}
                className="text-ink min-h-[34px] rounded-full bg-white px-3 text-[13px] font-bold hover:bg-white/90"
              >
                {t("cart.change")}
              </button>
            ) : null}
          </div>
          <div className="text-on-accent-soft border-t border-white/20 px-3.5 py-1.5">
            <Guests tone="accent" />
          </div>
        </div>
      ) : null}

      {/* 3 · How much: the one big number */}
      <div className="grid gap-1.5">
        <span className={label}>{block.label}</span>
        <span className="text-[38px] leading-none font-extrabold tracking-tight text-white tabular-nums">
          {block.value}
        </span>
        <span className="text-on-accent-muted text-[13px]">{block.note}</span>
        {lines.length > 0 && !compact ? (
          <button
            type="button"
            aria-expanded={showLines}
            onClick={() => setShowLines(!showLines)}
            className="text-on-accent-soft justify-self-start py-1 text-[13px] font-medium underline underline-offset-[3px] hover:text-white"
          >
            {showLines ? t("cart.hideBreakdown") : t("cart.breakdown")}
          </button>
        ) : null}
        {showLines || compact ? (
          <dl className="mt-1 grid gap-2 border-t border-white/20 pt-2.5">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3 text-[13px]">
                <dt className="text-on-accent-muted">
                  {l.labelKey === "touristTax" ? t("touristTax") : tr(l.name, data.locale)}
                </dt>
                <dd className="text-white tabular-nums">{money(l.amountCents)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {/* 4 · Chosen extras */}
      {chosen.length > 0 && !compact ? (
        <div className="grid gap-2 border-t border-white/20 pt-3.5">
          <span className={label}>{t("v2.yourExtras")}</span>
          {chosen.map((l, i) => (
            <div key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-white">{tr(l.name, data.locale)}</span>
              <span className="font-medium text-white tabular-nums">{money(l.amountCents)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* 5 · Phones only (v2.2): on a computer the reassurances are in step 3, the testimonial in step 1, the owner in step 2. */}
      {compact ? (
        <div className="bg-accent-deep grid gap-4 rounded-lg px-4 pt-5 pb-6">
          <ul className="text-on-accent-soft grid gap-2 text-[13px]">
            {(b.step === 3 ? data.trustOnPayment : data.trust).map((line) => (
              <li key={line} className="inline-flex items-start gap-2">
                <Check className="text-on-accent-muted mt-0.5 size-4 shrink-0" /> {line}
              </li>
            ))}
          </ul>
          {!compact ? <TestimonialCarousel tone="accent" /> : null}
          <div className="flex items-center gap-3 border-t border-white/15 pt-4">
            <span className="text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold">
              {initials}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="text-on-accent-muted text-xs">{t("v2.questions")}</span>
              <span className="text-[15px] font-bold text-white">
                {contact?.name ?? t("v2.ownerFallback")}
              </span>
            </span>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                aria-label={t("cart.whatsapp")}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <MessageCircle className="size-4" />
              </a>
            ) : null}
            {contact?.phone ? (
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                aria-label={t("cart.call")}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <Phone className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Step 2 (v2.2): "Otázky pred rezerváciou? Odpovedá Jana." with WhatsApp and a call — only with the owner's details. */
function AskOwner() {
  const t = useTranslations("guest");
  const b = useBooking();
  const d = useDates();
  const contact = b.data.contact;
  if (!contact?.whatsapp && !contact?.phone) return null;
  const { range } = b;
  const wa = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}${
        range.checkIn && range.checkOut
          ? `?text=${encodeURIComponent(
              t("cart.whatsappText", {
                from: d.long(range.checkIn),
                to: d.long(range.checkOut),
                guests: b.adults + b.children,
              }),
            )}`
          : ""
      }`
    : null;
  const initials = (contact.name ?? b.data.propertyName)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-[#f4f3ef] px-5 py-4">
      <span className="bg-primary text-primary-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
        {initials}
      </span>
      <span className="text-ink min-w-0 flex-1 text-[15px] font-medium">
        {t("v2.askTitle", { name: contact.name ?? t("v2.ownerFallback") })}
      </span>
      <span className="flex gap-2">
        {wa ? (
          <Button asChild variant="outline" className="rounded-full">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle /> {t("cart.whatsapp")}
            </a>
          </Button>
        ) : null}
        {contact.phone ? (
          <Button asChild variant="outline" className="rounded-full">
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
              <Phone /> {t("cart.call")}
            </a>
          </Button>
        ) : null}
      </span>
    </div>
  );
}
