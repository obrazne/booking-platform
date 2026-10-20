"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seasonFor } from "@/core/pricing/calculate";
import { addDays, diffDays, isoWeekday, type IsoDate } from "@/core/pricing/dates";
import type { Discount, Season } from "@/core/pricing/types";
import { tr } from "@/core/i18n/localized";
import { cn } from "@/lib/utils";

export type CalendarSelection = { checkIn: IsoDate | null; checkOut: IsoDate | null };

type Props = {
  locale: string;
  currency: string;
  seasons: Season[];
  rates: Record<string, number>;
  /** Automatic discounts shown as a hint in the bubble (e.g. "from 6 nights −10 %"). */
  discounts?: Discount[];
  /** Blocked nights (ISO dates). */
  busy: string[];
  today: IsoDate;
  value: CalendarSelection;
  onChange: (value: CalendarSelection) => void;
  /** Months side by side on wide screens; phones always show one. */
  months?: number;
  /** Price of a stay for the check-out bubble; null when it cannot be priced. */
  stayPrice?: (checkIn: IsoDate, checkOut: IsoDate) => number | null;
  /** Show the hover bubble (only in the calendar that is being used, B7 visual). */
  bubbles?: boolean;
};

function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(month: IsoDate, n: number): IsoDate {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 10);
}

function daysOfMonth(month: IsoDate): (IsoDate | null)[] {
  const cells: (IsoDate | null)[] = Array.from({ length: isoWeekday(month) - 1 }, () => null);
  for (let d = month; d.slice(0, 7) === month.slice(0, 7); d = addDays(d, 1)) cells.push(d);
  return cells;
}

function tint(color: string | null | undefined, alpha: string): string | undefined {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : undefined;
}

/**
 * Availability calendar (approved guest visual): nightly price in each day, seasons softly tinted with a legend,
 * busy nights struck through, range selection with a live preview, and a dark bubble explaining the day.
 * A day stands for the night that starts on it; the check-out day may be the first night of another stay.
 */
export function AvailabilityCalendar({
  locale,
  currency,
  seasons,
  rates,
  discounts = [],
  busy,
  today,
  value,
  onChange,
  months = 2,
  stayPrice,
  bubbles = true,
}: Props) {
  const t = useTranslations("guest.calendar");
  const busySet = useMemo(() => new Set(busy), [busy]);
  const [first, setFirst] = useState(monthStart(value.checkIn ?? today));
  const [hover, setHover] = useState<IsoDate | null>(null);
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      cents / 100,
    );
  // Compact price inside a day (currency is in the legend and the bubble).
  const dayPrice = (cents: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: false }).format(
      cents / 100,
    );
  const fmtMonth = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const fmtDay = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const fmtShort = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
  const asDate = (d: IsoDate) => new Date(`${d}T00:00:00Z`);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );
  const stayDiscount = discounts
    .filter((d) => d.kind === "length_of_stay" && d.minNights && d.percentBp)
    .sort((a, b) => (a.minNights ?? 0) - (b.minNights ?? 0))[0];

  const info = (date: IsoDate) => {
    const season = seasonFor(date, seasons);
    const rate = season ? rates[season.id] : undefined;
    return {
      season,
      rate,
      past: date < today,
      busy: busySet.has(date),
      arrivalAllowed:
        !season?.arrivalDays ||
        season.arrivalDays.length === 0 ||
        season.arrivalDays.includes(isoWeekday(date)),
    };
  };
  const canArrive = (date: IsoDate) => {
    const d = info(date);
    return !d.past && !d.busy && d.arrivalAllowed && d.rate !== undefined;
  };
  const blockedBetween = (from: IsoDate, to: IsoDate) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (busySet.has(d)) return true;
    return false;
  };
  const minFor = (checkIn: IsoDate) => info(checkIn).season?.minNights ?? 1;

  const selectingOut = Boolean(value.checkIn && !value.checkOut);
  const outPossible = (date: IsoDate) =>
    Boolean(value.checkIn && date > value.checkIn && !blockedBetween(value.checkIn, date));
  const outValid = (date: IsoDate) =>
    outPossible(date) && diffDays(value.checkIn!, date) >= minFor(value.checkIn!);

  function pick(date: IsoDate) {
    if (selectingOut && outValid(date)) {
      onChange({ checkIn: value.checkIn, checkOut: date });
      return;
    }
    // A later day beyond a busy night (or any free day) starts a new selection.
    if (canArrive(date)) onChange({ checkIn: date, checkOut: null });
  }

  const preview = (date: IsoDate) => {
    if (!value.checkIn) return false;
    if (value.checkOut) return date > value.checkIn && date < value.checkOut;
    return Boolean(
      hover && hover > value.checkIn && date > value.checkIn && date <= hover && outPossible(hover),
    );
  };

  function bubble(date: IsoDate): { lines: string[]; dated: boolean } {
    const d = info(date);
    if (selectingOut && value.checkIn && date > value.checkIn) {
      if (!outPossible(date)) return { lines: [t("blockedRange")], dated: false };
      const nights = diffDays(value.checkIn, date);
      const price = stayPrice?.(value.checkIn, date);
      const lines = [
        price !== null && price !== undefined
          ? t("checkoutHere", { nights, price: money(price) })
          : t("checkoutNights", { nights }),
      ];
      if (nights < minFor(value.checkIn))
        lines.push(t("belowMinimum", { count: minFor(value.checkIn) }));
      return { lines, dated: false };
    }
    if (d.busy) return { lines: [t("busy")], dated: false };
    const lines = [fmtDay.format(asDate(date))];
    if (d.season && d.rate !== undefined) {
      lines.push(`${tr(d.season.name, locale)} · ${t("perNight", { price: money(d.rate) })}`);
    }
    if (!d.arrivalAllowed) lines.push(t("arrivalNotAllowed"));
    else if (d.season) {
      let rule = t("arrivalMin", { count: d.season.minNights });
      if (stayDiscount) {
        rule += ` ${t("stayDiscount", { nights: stayDiscount.minNights!, percent: stayDiscount.percentBp! / 100 })}`;
      }
      lines.push(rule);
    }
    return { lines, dated: true };
  }

  let hint: { text: string; warn: boolean } | null = null;
  if (!value.checkIn) hint = { text: t("selectCheckIn"), warn: false };
  else if (!value.checkOut) {
    const s = info(value.checkIn).season;
    const hovered =
      hover && hover > value.checkIn && outPossible(hover) ? diffDays(value.checkIn, hover) : null;
    hint = {
      text: t("pickCheckOut", {
        date: fmtShort.format(asDate(value.checkIn)),
        count: s?.minNights ?? 1,
        season: s ? tr(s.name, locale) : "",
      }),
      warn: hovered !== null && hovered < (s?.minNights ?? 1),
    };
  }

  const usedSeasons = seasons.filter((s) => Object.prototype.hasOwnProperty.call(rates, s.id));
  const monthList = Array.from({ length: months }, (_, i) => addMonths(first, i));

  return (
    <div className="grid gap-3">
      <div className={cn("grid gap-8", months > 1 && "md:grid-cols-2")}>
        {monthList.map((month, mi) => (
          <div key={month} className={cn("grid content-start gap-2", mi > 0 && "hidden md:grid")}>
            <div className="flex h-9 items-center justify-between">
              {mi === 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setFirst(addMonths(first, -1))}
                  disabled={first <= monthStart(today)}
                  aria-label={t("prev")}
                >
                  <ChevronLeft />
                </Button>
              ) : (
                <span className="size-9" />
              )}
              <p className="text-sm font-medium capitalize">{fmtMonth.format(asDate(month))}</p>
              {mi === monthList.length - 1 || months === 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("rounded-full", mi < monthList.length - 1 && "md:invisible")}
                  onClick={() => setFirst(addMonths(first, 1))}
                  aria-label={t("next")}
                >
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:invisible"
                  onClick={() => setFirst(addMonths(first, 1))}
                  aria-label={t("next")}
                >
                  <ChevronRight />
                </Button>
              )}
            </div>
            <div className="text-muted-foreground grid grid-cols-7 text-center font-mono text-[11px] uppercase">
              {weekdays.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHover(null)}>
              {daysOfMonth(month).map((date, i) => {
                if (!date) return <span key={`e${i}`} />;
                const d = info(date);
                const col = isoWeekday(date) - 1;
                const edge = date === value.checkIn || date === value.checkOut;
                const inPreview = preview(date);
                const enabled = !d.past && (canArrive(date) || (selectingOut && outPossible(date)));
                const content = bubbles && hover === date && !d.past ? bubble(date) : null;
                return (
                  <div key={date} className="relative">
                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={() => pick(date)}
                      onMouseEnter={() => setHover(date)}
                      onFocus={() => setHover(date)}
                      onBlur={() => setHover(null)}
                      aria-pressed={edge}
                      data-date={date}
                      aria-label={[
                        fmtDay.format(asDate(date)),
                        d.busy
                          ? t("busy")
                          : !d.past && d.rate !== undefined
                            ? t("perNight", { price: money(d.rate) })
                            : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      style={
                        !edge && !inPreview && !d.busy && !d.past
                          ? { backgroundColor: tint(d.season?.color, "14") }
                          : undefined
                      }
                      className={cn(
                        "flex aspect-square w-full flex-col items-center justify-center rounded-xl text-sm transition-colors duration-200",
                        "focus-visible:ring-ring outline-none focus-visible:ring-2",
                        enabled && "hover:ring-primary/40 hover:ring-1",
                        d.busy && "text-muted-foreground/60 line-through",
                        (d.past || (!enabled && !d.busy)) && "text-muted-foreground/40",
                        inPreview && "bg-primary/[.13]",
                        edge && "bg-primary text-primary-foreground",
                      )}
                    >
                      <span className="leading-none">{Number(date.slice(8))}</span>
                      {!d.past && !d.busy && d.rate !== undefined ? (
                        <span
                          className={cn(
                            "mt-0.5 font-mono text-[9px] leading-none sm:text-[10px]",
                            // Small price: darker than muted text, ≥ 4.5 : 1 on every season tint and the warm card (Z70).
                            !edge && "text-[#53575d]",
                          )}
                        >
                          {dayPrice(d.rate)}
                        </span>
                      ) : null}
                    </button>
                    {content ? (
                      <div
                        role="tooltip"
                        className={cn(
                          "bg-tooltip pointer-events-none absolute bottom-full z-30 mb-2 grid w-[220px] gap-1 rounded-[14px] px-3 py-2.5 text-xs leading-snug text-white shadow-lg",
                          col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2",
                        )}
                      >
                        {content.lines.map((line, k) => (
                          <span
                            key={k}
                            className={
                              k === 0 && content.dated
                                ? "font-mono text-[11px] text-white/70"
                                : undefined
                            }
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {usedSeasons.length > 1 ? (
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {usedSeasons.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className="border-line size-3 rounded-sm border"
                style={{ backgroundColor: tint(s.color, "33") }}
              />
              {tr(s.name, locale)} · {money(rates[s.id]!)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-9 items-center justify-between gap-3">
        {hint ? (
          <p className={cn("text-sm", hint.warn ? "text-[#b5532f]" : "text-muted-foreground")}>
            {hint.text}
          </p>
        ) : (
          <span />
        )}
        {value.checkIn ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ checkIn: null, checkOut: null })}
          >
            {t("clear")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
