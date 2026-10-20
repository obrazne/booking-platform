"use client";

import { useEffect, useId, useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, X } from "lucide-react";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { cn } from "@/lib/utils";
import { counts, fitsStayAccount, guestCanCancel } from "../rules";
import { cancelGuestOrder, orderService, type GuestOrderResult } from "./actions";
import type { GuestOffer, GuestOrder } from "./load";

type Props = {
  reservationId: string;
  token?: string;
  locale: string;
  currency: string;
  timeZone: string;
  limitCents: number;
  ownerName: string | null;
  offers: GuestOffer[];
  orders: GuestOrder[];
  /** During the stay the section offers what can still be ordered (design v2.4). */
  during?: boolean;
};

const MOBILE = "(max-width: 639px)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(MOBILE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** Phones get the details of a service in a bottom sheet (design `MobilPobyt`), larger screens inline. */
function useMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
}

/**
 * "K pobytu si môžete doobjednať" (Z37, design v2.3 `UcetPobyt`): one row per service; opened it shows the photo,
 * description, days, how to pay and "Objednať záväzne". Orders of the guest show their state and can be cancelled
 * until the cutoff.
 */
export function UpsellOffers(props: Props) {
  const t = useTranslations("modules.upsell.guest");
  const mobile = useMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  const fmt = (cents: number) => formatMoney(money(cents, props.currency), props.locale);

  useEffect(() => {
    if (!mobile || !openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile, openId]);

  return (
    <section className="grid gap-3.5" aria-labelledby="upsell-title">
      <div className="grid gap-1">
        <h2
          id="upsell-title"
          className="font-heading text-ink text-[26px] leading-tight font-extrabold tracking-tight"
        >
          {props.during ? (
            t("titleDuring")
          ) : (
            <>
              {t("title")} <span className="text-ink-soft">{t("title2")}</span>
            </>
          )}
        </h2>
        <p className="text-sm text-[#5a6672]">
          {props.during ? t("subtitleDuring") : t("subtitle")}
        </p>
      </div>
      <ul className="border-line border-t">
        {props.offers.map((offer) => {
          const mine = props.orders.filter(
            (o) => o.serviceId === offer.id && o.status !== "cancelled",
          );
          const active = mine.filter((o) => counts(o.status));
          const isOpen = openId === offer.id;
          const awaiting = active.some((o) => o.status === "awaiting_confirmation");
          return (
            <li
              key={offer.id}
              className={cn("border-line border-b", isOpen && !mobile && "bg-surface")}
            >
              <div className="flex min-h-14 items-center gap-3 pr-2 pl-1.5 hover:bg-[#fafaf8]">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : offer.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-baseline gap-2.5 overflow-hidden py-3.5 text-left whitespace-nowrap"
                >
                  <span className="text-ink truncate text-[15px] font-medium">{offer.name}</span>
                  <span className="text-muted-foreground truncate text-[13px] max-sm:hidden">
                    <PriceUnit offer={offer} />
                  </span>
                </button>
                {active.length ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                      awaiting
                        ? "bg-[#fbf1e6] text-[#8a4a1c]"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {awaiting ? t("status.awaiting") : t("status.ordered")}
                  </span>
                ) : null}
                <span className="text-ink text-sm font-medium whitespace-nowrap tabular-nums">
                  {active.length
                    ? fmt(active.reduce((s, o) => s + o.amountCents, 0))
                    : offer.mode === "none"
                      ? `+ ${fmt(offer.unitCents)}`
                      : t("from", { price: fmt(offer.unitCents) })}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : offer.id)}
                  aria-expanded={isOpen}
                  aria-label={t("details", { name: offer.name })}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#5a6672] hover:bg-black/5"
                >
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
              </div>
              {isOpen ? (
                mobile ? (
                  <Sheet title={offer.name} onClose={() => setOpenId(null)}>
                    <OfferDetail {...props} offer={offer} mine={mine} fmt={fmt} />
                  </Sheet>
                ) : (
                  <div className="px-1.5 pt-1 pb-6">
                    <OfferDetail {...props} offer={offer} mine={mine} fmt={fmt} />
                  </div>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PriceUnit({ offer }: { offer: GuestOffer }) {
  const tm = useTranslations("priceModels");
  const t = useTranslations("modules.upsell.guest");
  return (
    <>
      {tm(offer.priceModel)}
      {offer.requiresConfirmation ? ` · ${t("confirmShort")}` : ""}
    </>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("modules.upsell.guest");
  const id = useId();
  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#11212f]/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="animate-in slide-in-from-bottom-8 fixed inset-x-0 bottom-0 z-50 grid max-h-[88dvh] gap-4 overflow-y-auto rounded-t-2xl bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(17,33,47,0.18)] motion-reduce:animate-none"
      >
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[#dcd9d1]" />
        <div className="flex items-start justify-between gap-3">
          <h3 id={id} className="text-ink text-xl font-extrabold tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label={t("close")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function OfferDetail({
  offer,
  mine,
  fmt,
  ...props
}: Props & { offer: GuestOffer; mine: GuestOrder[]; fmt: (cents: number) => string }) {
  const t = useTranslations("modules.upsell.guest");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const firstOpen = offer.days.filter((d) => d.open && !d.taken).map((d) => d.date);
  const [picked, setDays] = useState<string[]>(
    offer.mode === "multi" ? firstOpen : offer.mode === "single" ? firstOpen.slice(0, 1) : [],
  );
  // Days ordered meanwhile (or closed) drop out of the choice — never twice for the same day.
  const days = picked.filter((d) => firstOpen.includes(d));
  const amount = offer.mode === "none" ? offer.unitCents : offer.unitCents * days.length;
  const openOnAccount = props.orders
    .filter((o) => counts(o.status) && !o.paidAt && o.paymentMethod === "stay_account")
    .reduce((s, o) => s + o.amountCents, 0);
  const accountFits = fitsStayAccount(openOnAccount, amount, props.limitCents);
  const accountAllowed = offer.stayAccount && accountFits;
  const [method, setMethod] = useState<"stay_account" | "transfer">(
    offer.stayAccount ? "stay_account" : "transfer",
  );
  const pay = accountAllowed ? method : "transfer";
  const dayLabel = (date: string) => formatDate(date, props.locale, "dayMonth");
  const run = (action: () => Promise<GuestOrderResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      setDone(false);
      const res = await action();
      if (res.ok) after?.();
      else setError(t(`errors.${res.error}`));
    });

  return (
    <div className="flex gap-[22px] max-sm:flex-col">
      {offer.image ? (
        <div className="relative h-[120px] shrink-0 overflow-hidden rounded-lg bg-[#f1eee6] sm:w-[170px]">
          <Image src={offer.image} alt="" fill sizes="170px" className="object-cover" />
        </div>
      ) : null}
      <div className="grid min-w-0 flex-1 content-start gap-3.5">
        <p className="text-sm leading-relaxed text-[#5a6672] sm:hidden">
          <PriceUnit offer={offer} />
        </p>
        {offer.description ? (
          <p className="text-sm leading-relaxed text-[#5a6672]">{offer.description}</p>
        ) : null}

        {mine.length ? (
          <ul className="grid gap-2.5 text-sm text-[#3b3d42]">
            {mine.map((o) => (
              <OrderLine key={o.id} order={o} fmt={fmt} {...props} dayLabel={dayLabel} />
            ))}
          </ul>
        ) : null}

        {offer.open ? (
          <>
            {offer.mode !== "none" ? (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-[13px] font-medium text-[#3b3d42]">
                  {offer.mode === "single" ? t("daysSingle") : t("daysMulti")}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {offer.days.map((d) => {
                    const on = days.includes(d.date);
                    const disabled = !d.open || d.taken;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        title={d.taken ? t("dayTaken") : !d.open ? t("dayClosed") : undefined}
                        onClick={() =>
                          setDays((cur) =>
                            offer.mode === "single"
                              ? on
                                ? []
                                : [d.date]
                              : on
                                ? cur.filter((x) => x !== d.date)
                                : [...cur, d.date].sort(),
                          )
                        }
                        className={cn(
                          "min-h-10 rounded-full border px-3.5 text-sm font-medium",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-[#dcd9d1] bg-white text-[#11212f]",
                          disabled && "cursor-not-allowed line-through opacity-45",
                        )}
                      >
                        {dayLabel(d.date)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-[13px] font-medium text-[#3b3d42]">{t("howPay")}</legend>
              <div className="grid grid-cols-2 gap-2">
                <PayCard
                  selected={pay === "stay_account"}
                  disabled={!accountAllowed}
                  title={t("payAccount")}
                  note={t("payAccountNote")}
                  onClick={() => setMethod("stay_account")}
                />
                <PayCard
                  selected={pay === "transfer"}
                  title={t("payNow")}
                  note={t("payNowNote")}
                  onClick={() => setMethod("transfer")}
                />
              </div>
              {!offer.stayAccount ? (
                <p className="text-[13px] text-[#5a6672]">{t("accountNotAllowed")}</p>
              ) : !accountFits ? (
                <p className="text-[13px] text-[#5a6672]">
                  {t("accountOverLimit", { limit: fmt(props.limitCents) })}
                </p>
              ) : null}
            </fieldset>

            {offer.requiresConfirmation ? (
              <p className="text-[13px] text-[#5a6672]">
                {t("needsConfirm", { name: props.ownerName ?? "none" })}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <button
                type="button"
                disabled={amount === 0 || pending}
                onClick={() =>
                  run(
                    () =>
                      orderService({
                        reservationId: props.reservationId,
                        serviceId: offer.id,
                        dates: offer.mode === "none" ? [] : days,
                        paymentMethod: pay,
                        token: props.token,
                      }),
                    () => setDone(true),
                  )
                }
                className="bg-primary text-primary-foreground min-h-[46px] rounded-full px-[22px] text-[15px] font-bold disabled:cursor-not-allowed disabled:bg-[#d9dcd8]"
              >
                {pending ? t("ordering") : t("order", { amount: fmt(amount) })}
              </button>
              <span className="text-muted-foreground text-xs">
                {offer.mode === "none"
                  ? t("cutoffAt", {
                      date: formatDateTime(offer.cutoffAt, props.locale, props.timeZone, "short"),
                    })
                  : t("cutoffBefore", { hours: offer.cutoffHours })}
              </span>
            </div>
          </>
        ) : null}

        {done ? (
          <p role="status" className="text-primary text-sm font-medium">
            {t("done")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-[#a04a1f]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PayCard({
  selected,
  disabled,
  title,
  note,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid content-start justify-items-start gap-0.5 rounded-[10px] border-[1.5px] px-3.5 py-3 text-left",
        selected ? "border-primary bg-primary/5" : "border-[#e9e5db] bg-white",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="text-ink text-sm font-bold">{title}</span>
      <span className="text-xs text-[#5a6672]">{note}</span>
    </button>
  );
}

function OrderLine({
  order,
  fmt,
  dayLabel,
  ownerName,
  locale,
  timeZone,
  token,
}: Props & { order: GuestOrder; fmt: (c: number) => string; dayLabel: (d: string) => string }) {
  const t = useTranslations("modules.upsell.guest");
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancellable = guestCanCancel(order, new Date());
  const what = [
    order.serviceDate ? dayLabel(order.serviceDate) : null,
    fmt(order.amountCents),
    order.paidAt
      ? t("paid")
      : t(`methods.${order.paymentMethod === "card" ? "transfer" : order.paymentMethod}`),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="grid gap-1.5">
      <span>
        <strong className="text-ink font-medium">
          {order.status === "declined"
            ? t("status.declined")
            : order.status === "awaiting_confirmation"
              ? t("status.awaiting")
              : t("status.ordered")}
        </strong>{" "}
        · {what}
      </span>
      {order.status === "awaiting_confirmation" ? (
        <span className="text-[13px] text-[#5a6672]">
          {t("awaitingLine", { name: ownerName ?? "none" })}
        </span>
      ) : null}
      {order.status === "declined" && order.declineReason ? (
        <span className="text-[13px] text-[#5a6672]">
          {t("declinedReason", { reason: order.declineReason })}
        </span>
      ) : null}
      {cancellable ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {asking ? (
            <>
              <span className="text-[13px]">{t("cancelAsk")}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const res = await cancelGuestOrder(order.id, token);
                    if (!res.ok) setError(t(`errors.${res.error}`));
                  })
                }
                className="text-sm font-medium text-[#a04a1f] underline underline-offset-[3px]"
              >
                {t("cancelYes")}
              </button>
              <button
                type="button"
                onClick={() => setAsking(false)}
                className="text-ink text-sm font-medium underline underline-offset-[3px]"
              >
                {t("cancelNo")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="text-sm font-medium text-[#a04a1f] underline underline-offset-[3px]"
            >
              {t("cancel")}
            </button>
          )}
          <span className="text-muted-foreground text-xs">
            {t("cancelUntil", {
              date: formatDateTime(order.cutoffAt, locale, timeZone, "short"),
            })}
          </span>
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm font-medium text-[#a04a1f]">
          {error}
        </span>
      ) : null}
    </li>
  );
}
