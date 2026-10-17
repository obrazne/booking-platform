"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBlock, deleteBlock } from "@/app/admin/blocks/actions";
import { MarkPaidButton } from "@/app/admin/reservations/quick-actions";
import type { OccupancyEvent } from "@/core/admin/occupancy";
import { PanelSection, PanelSummary, SidePanel } from "@/core/admin/record-panel";
import { OCCUPANCY_CLASS, StatusPill } from "@/core/admin/status";
import { formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { addDays, diffDays, isoWeekday } from "@/core/pricing/dates";
import { cn } from "@/lib/utils";
import { quoteStay, updateBlockLabel, type StayQuote } from "./actions";

export type CalendarDay = { date: string; priceCents: number | null };

type Selection = { start: string; end: string | null };

const PORTAL_NAMES: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb" };

/**
 * Booking's iCal export does not tell a reservation from a date closed by hand ("CLOSED - Not available") and leaves
 * out dates taken from other calendars (Z41) — such an event is shown as closed on Booking, not as a stay.
 */
function closedOnPortal(e: { kind: string; label?: string | null }): boolean {
  return e.kind === "portal" && /^closed\b/i.test(e.label ?? "");
}

function monthGrid(first: string): string[][] {
  const [y, m] = first.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 10);
  const monday = addDays(first, 1 - isoWeekday(first));
  const weeks: string[][] = [];
  for (let mon = monday; mon < next; mon = addDays(mon, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(mon, i)));
  }
  return weeks;
}

/**
 * Calendar of one unit (vizuál administrácie v1, 04). Bars start at noon of the arrival day and end at noon of the
 * departure day, so changeovers are visible. Click a bar → panel by its kind; click arrival and departure in free
 * days → "Nový termín" with the price from the same calculation as the web. Arrow keys move by days, Enter picks.
 */
export function CalendarView({
  unitId,
  today,
  months,
  prevHref,
  nextHref,
  todayHref,
  days,
  events,
  currency,
  locale,
  timezone,
  sync,
}: {
  unitId: string;
  today: string;
  months: { first: string; title: string }[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
  days: CalendarDay[];
  events: OccupancyEvent[];
  currency: string;
  locale: string;
  timezone: string;
  sync: ReactNode;
}) {
  const t = useTranslations("adminV1.calendar");
  const tv = useTranslations("adminV1.reservations");
  const tr = useTranslations("reservations");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [quote, setQuote] = useState<StayQuote | null>(null);
  const [quoting, startQuote] = useTransition();
  const grid = useRef<HTMLDivElement>(null);

  const price = new Map(days.map((d) => [d.date, d.priceCents]));
  const occupiedBy = (night: string) =>
    events.find((e) => night >= e.checkIn && night < e.checkOut);
  const fmt = (cents: number) => formatMoney(money(cents, currency), locale);
  const plain = (cents: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(cents / 100);
  const longDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  const event = events.find((e) => e.id === eventId) ?? null;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, 0, 5 + i)),
    ),
  );

  function close() {
    setSelection(null);
    setEventId(null);
    setQuote(null);
  }

  function pick(date: string) {
    setEventId(null);
    if (!selection || selection.end) {
      setSelection({ start: date, end: null });
      setQuote(null);
      return;
    }
    if (date <= selection.start) {
      setSelection({ start: date, end: null });
      return;
    }
    setSelection({ start: selection.start, end: date });
    startQuote(async () => setQuote(await quoteStay(unitId, selection.start, date)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const date = target.dataset.calDay;
    if (!date) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = grid.current?.querySelector<HTMLElement>(
      `[data-cal-day="${addDays(date, step)}"]`,
    );
    next?.focus();
  }

  const inSelection = (d: string) =>
    selection
      ? selection.end
        ? d >= selection.start && d < selection.end
        : d === selection.start
      : false;
  const focusable =
    selection?.start ?? (days.some((d) => d.date === today) ? today : months[0]!.first);
  const panelOpen = Boolean(event) || Boolean(selection?.end);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label={t("prev")}>
            <Link href={prevHref} scroll={false}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label={t("next")}>
            <Link href={nextHref} scroll={false}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <span className="text-ink text-lg font-bold first-letter:uppercase">
          {months.map((m) => m.title).join(" – ")}
        </span>
        <Button asChild variant="outline">
          <Link href={todayHref} scroll={false}>
            {t("today")}
          </Link>
        </Button>
        <div className="md:ml-auto">{sync}</div>
      </div>

      <div
        ref={grid}
        role="application"
        aria-label={t("gridLabel")}
        onKeyDown={onKey}
        className="grid items-start gap-8 xl:grid-cols-2"
      >
        {months.map((m, mi) => {
          const weeks = monthGrid(m.first);
          const monthKey = m.first.slice(0, 7);
          return (
            <section key={m.first} className={cn("grid gap-2", mi > 0 && "hidden md:grid")}>
              <h2 className="text-ink text-base font-bold first-letter:uppercase">{m.title}</h2>
              <div className="label-mono grid grid-cols-7">
                {weekdays.map((w) => (
                  <span key={w} className="px-2 py-1">
                    {w}
                  </span>
                ))}
              </div>
              <div className="border-line border-t border-l">
                {weeks.map((week) => {
                  const mon = week[0]!;
                  const inMonth = week.map((d) => d.slice(0, 7) === monthKey);
                  const cMin = inMonth.indexOf(true);
                  const cMax = inMonth.lastIndexOf(true) + 1;
                  const bars = events.flatMap((e) => {
                    const s0 = diffDays(mon, e.checkIn) + 0.5;
                    const e0 = diffDays(mon, e.checkOut) + 0.5;
                    const s1 = Math.max(s0, cMin);
                    const e1 = Math.min(e0, cMax);
                    if (e1 <= s1) return [];
                    return [{ e, s0, e0, s1, e1 }];
                  });
                  return (
                    <div key={mon} className="relative grid grid-cols-7">
                      {week.map((d, i) => {
                        if (!inMonth[i]) {
                          return (
                            <span
                              key={d}
                              className="border-line h-16 border-r border-b bg-[#fcfbf9] md:h-[92px] dark:bg-transparent"
                            />
                          );
                        }
                        const occ = occupiedBy(d);
                        const sel = inSelection(d);
                        const p = price.get(d);
                        const past = d < today;
                        return (
                          <button
                            key={d}
                            type="button"
                            data-cal-day={d}
                            tabIndex={d === focusable ? 0 : -1}
                            disabled={past}
                            aria-pressed={sel}
                            aria-label={[
                              longDate(d),
                              d === today ? t("todayMark") : null,
                              occ
                                ? t("occupied")
                                : p !== null && p !== undefined
                                  ? t("priceLabel", { price: fmt(p) })
                                  : null,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                            onClick={() => pick(d)}
                            className={cn(
                              "border-line flex h-16 flex-col justify-between border-r border-b px-2 py-1.5 text-left transition-colors md:h-[92px] md:px-[9px] md:py-2",
                              "focus-visible:ring-ring focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none",
                              sel
                                ? "bg-accent-soft"
                                : isoWeekday(d) >= 6
                                  ? "bg-[#fbfaf7] dark:bg-white/[0.02]"
                                  : "bg-background",
                              past ? "cursor-default opacity-60" : "hover:bg-accent-soft",
                            )}
                          >
                            <span
                              className={cn(
                                "text-[13px]",
                                sel ? "text-primary font-bold" : "text-ink font-medium",
                                d === today &&
                                  "bg-ink inline-flex size-6 items-center justify-center rounded-full text-white",
                              )}
                            >
                              {Number(d.slice(8))}
                            </span>
                            {!occ && p !== null && p !== undefined ? (
                              <span
                                className={cn(
                                  "self-end font-mono text-[10px] md:text-[11px]",
                                  sel ? "text-primary" : "text-[#5a6672]",
                                )}
                              >
                                {plain(p)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                      {bars.map(({ e, s0, e0, s1, e1 }) => {
                        const label = e.reservation
                          ? `${e.reservation.guestName} · ${e.reservation.adults + e.reservation.children}`
                          : closedOnPortal(e)
                            ? t("closedOnBooking")
                            : e.kind === "portal"
                              ? (PORTAL_NAMES[e.portal ?? ""] ?? e.label ?? t("portal"))
                              : (e.label ?? t("blockKind"));
                        const left = s1 === s0 ? "rounded-l-lg" : "";
                        const right = e1 === e0 ? "rounded-r-lg" : "";
                        return (
                          <button
                            key={e.id}
                            type="button"
                            data-panel-switch=""
                            title={label}
                            aria-label={`${label}, ${longDate(e.checkIn)} – ${longDate(e.checkOut)}`}
                            onClick={() => {
                              setSelection(null);
                              setQuote(null);
                              setEventId(e.id);
                            }}
                            style={{
                              left: `calc(${(s1 / 7) * 100}% + 2px)`,
                              width: `calc(${((e1 - s1) / 7) * 100}% - 4px)`,
                            }}
                            className={cn(
                              "absolute top-7 h-6 truncate px-2 text-left text-[11px] font-bold md:top-[34px] md:h-7 md:px-2.5 md:text-xs",
                              OCCUPANCY_CLASS[e.kind],
                              left,
                              right,
                              e.conflict && "ring-2 ring-[#c07a3e]",
                              eventId === e.id && "ring-ink ring-2",
                            )}
                          >
                            {s1 === s0 || s1 === cMin ? label : ""}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-muted-foreground text-[13px] font-normal" aria-live="polite">
        {selection && !selection.end
          ? t("hintArrival", { date: longDate(selection.start) })
          : t("hint")}
      </p>

      <SidePanel
        open={panelOpen}
        onClose={close}
        label={event ? (event.reservation?.guestName ?? t("panelLabel")) : t("newStay")}
        header={
          event?.reservation ? (
            <>
              <span className="text-ink font-mono text-[13px] font-medium">
                {event.reservation.number}
              </span>
              <StatusPill
                status={event.reservation.status}
                label={tr(`statuses.${event.reservation.status as "confirmed"}`)}
              />
            </>
          ) : (
            <span className="label-mono">
              {event
                ? event.kind === "portal"
                  ? t("portalKicker")
                  : t("blockKind")
                : t("newStay")}
            </span>
          )
        }
        actions={
          event?.reservation ? (
            <>
              <Button asChild className="font-bold">
                <Link href={`/admin/reservations?panel=reservation:${event.reservation.id}`}>
                  {t("openReservation")}
                </Link>
              </Button>
              {event.reservation.status === "pending_payment" ? (
                <MarkPaidButton
                  id={event.reservation.id}
                  amountLabel={fmt(event.reservation.totalCents)}
                  className="bg-background text-ink border-input border hover:bg-[#f7f6f2]"
                />
              ) : null}
            </>
          ) : event?.kind === "portal" ? (
            <Button asChild variant="outline">
              <Link href="/admin/ical">{t("syncSettings")}</Link>
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-6 text-sm font-normal">
          {event || selection?.end ? (
            <PanelSummary
              title={
                event
                  ? event.reservation
                    ? event.reservation.guestName
                    : closedOnPortal(event)
                      ? t("closedOnBooking")
                      : event.kind === "portal"
                        ? (PORTAL_NAMES[event.portal ?? ""] ?? event.label ?? t("portal"))
                        : (event.label ?? t("blockKind"))
                  : t("newStay")
              }
              subtitle={
                event?.reservation
                  ? t("directSub")
                  : event && closedOnPortal(event)
                    ? t("closedSub")
                    : event?.kind === "portal"
                      ? t("portalSub")
                      : event
                        ? t("blockSub")
                        : t("newStaySub")
              }
              facts={[
                { label: tv("checkIn"), value: longDate(event?.checkIn ?? selection!.start) },
                { label: tv("checkOut"), value: longDate(event?.checkOut ?? selection!.end!) },
                {
                  label: tv("nightsLabel"),
                  value: diffDays(
                    event?.checkIn ?? selection!.start,
                    event?.checkOut ?? selection!.end!,
                  ),
                },
                ...(event?.reservation
                  ? [
                      {
                        label: tv("people"),
                        value: `${event.reservation.adults}${event.reservation.children ? ` + ${event.reservation.children}` : ""}`,
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}

          {event?.reservation ? (
            event.reservation.status === "pending_payment" ? (
              <Notice warm>
                {t("pendingNotice", {
                  amount: fmt(event.reservation.totalCents),
                  date: event.reservation.paymentDueAt
                    ? new Intl.DateTimeFormat(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: timezone,
                      }).format(new Date(event.reservation.paymentDueAt))
                    : "—",
                })}
              </Notice>
            ) : (
              <Notice>{t("paidNotice", { amount: fmt(event.reservation.totalCents) })}</Notice>
            )
          ) : null}

          {event?.kind === "portal" ? (
            <>
              <p className="leading-relaxed">
                {t("portalBody", {
                  portal: PORTAL_NAMES[event.portal ?? ""] ?? event.label ?? t("portal"),
                })}
              </p>
              {sync}
            </>
          ) : null}

          {event?.kind === "block" ? <BlockEditor event={event} onDone={close} /> : null}

          {!event && selection?.end ? (
            <NewStay
              unitId={unitId}
              selection={{ start: selection.start, end: selection.end }}
              quote={quote}
              loading={quoting}
              fmt={fmt}
              longDate={longDate}
              onDone={close}
            />
          ) : null}
        </div>
      </SidePanel>
    </div>
  );
}

function Notice({ warm, children }: { warm?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-[10px] px-4 py-3.5 leading-relaxed",
        warm ? "card-warm text-[#5b3a1f]" : "bg-accent-soft text-[#1f3d35] dark:text-white",
      )}
    >
      {children}
    </p>
  );
}

function BlockEditor({ event, onDone }: { event: OccupancyEvent; onDone: () => void }) {
  const t = useTranslations("adminV1.calendar");
  const tf = useTranslations("forms");
  const [label, setLabel] = useState(event.label ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="label-mono">{t("reason")}</span>
        <Input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          className="font-bold"
          onClick={() =>
            start(async () => {
              const r = await updateBlockLabel(event.id, label);
              if (r.ok) toast.success(tf("saved"));
              else toast.error(tf("errors.generic"));
            })
          }
        >
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="border-[#efd6d0] text-[#a8432f] hover:bg-[#fbeceb] hover:text-[#a8432f]"
          onClick={() => {
            if (!window.confirm(t("removeBlockConfirm"))) return;
            start(async () => {
              await deleteBlock(event.id);
              onDone();
            });
          }}
        >
          {t("removeBlock")}
        </Button>
      </div>
    </div>
  );
}

function NewStay({
  unitId,
  selection,
  quote,
  loading,
  fmt,
  longDate,
  onDone,
}: {
  unitId: string;
  selection: { start: string; end: string };
  quote: StayQuote | null;
  loading: boolean;
  fmt: (cents: number) => string;
  longDate: (iso: string) => string;
  onDone: () => void;
}) {
  const t = useTranslations("adminV1.calendar");
  const tg = useTranslations("guest");
  const tf = useTranslations("forms");
  const tr = useTranslations("reservations");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  if (loading || !quote) return <p className="text-muted-foreground">{t("calculating")}</p>;
  const nights = diffDays(selection.start, selection.end);
  return (
    <div className="grid gap-6">
      <PanelSection label={t("priceTitle")}>
        {quote.lines.length ? (
          <dl className="border-line border-t">
            {quote.lines.map((l, i) => (
              <div key={i} className="border-line flex justify-between gap-3 border-b py-2.5">
                <dt>
                  {l.kind === "accommodation" ? `${l.quantity} × ` : ""}
                  {l.label === "touristTax" ? tg("touristTax") : l.label}
                </dt>
                <dd className="text-ink font-medium tabular-nums">{fmt(l.amountCents)}</dd>
              </div>
            ))}
            <div className="text-ink flex justify-between pt-3 text-base font-extrabold">
              <dt>{tr("total")}</dt>
              <dd className="tabular-nums">{fmt(quote.totalCents)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground">{t("noRate")}</p>
        )}
        <p className="text-muted-foreground text-xs">{t("priceNote")}</p>
      </PanelSection>

      {quote.conflict ? (
        <Notice warm>
          {t("conflict", {
            label: quote.conflict.label,
            from: longDate(quote.conflict.checkIn),
            to: longDate(quote.conflict.checkOut),
          })}
        </Notice>
      ) : quote.minNights ? (
        <Notice warm>{t("minNights", { min: quote.minNights })}</Notice>
      ) : (
        <Notice>{t("free", { nights })}</Notice>
      )}

      {!quote.conflict ? (
        <div className="grid gap-3">
          <Button asChild className="w-full font-bold">
            <Link
              href={`/admin/reservations/new?unit=${unitId}&check_in=${selection.start}&check_out=${selection.end}`}
            >
              {t("createManual")}
            </Link>
          </Button>
          <div className="flex gap-2">
            <Input
              value={reason}
              maxLength={80}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              aria-label={t("reason")}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const form = new FormData();
                  form.set("unit_id", unitId);
                  form.set("from", selection.start);
                  form.set("to", selection.end);
                  form.set("label", reason);
                  const r = await createBlock({ ok: false }, form);
                  if (r.ok) {
                    toast.success(tf("saved"));
                    onDone();
                  } else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
                })
              }
            >
              {t("blockThis")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
