"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seasonFor } from "@/core/pricing/calculate";
import { addDays, isoWeekday, type IsoDate } from "@/core/pricing/dates";
import type { Season } from "@/core/pricing/types";
import { cn } from "@/lib/utils";

export type CalendarSelection = { checkIn: IsoDate | null; checkOut: IsoDate | null };

type Props = {
  locale: string;
  currency: string;
  seasons: Season[];
  rates: Record<string, number>;
  /** Blocked nights (ISO dates). */
  busy: string[];
  today: IsoDate;
  value: CalendarSelection;
  onChange: (value: CalendarSelection) => void;
  /** Months shown side by side on wide screens (one on phones). */
  months?: number;
};

function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(month: IsoDate, n: number): IsoDate {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

function daysOfMonth(month: IsoDate): (IsoDate | null)[] {
  const first = month;
  const lead = isoWeekday(first) - 1;
  const cells: (IsoDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) cells.push(d);
  return cells;
}

/**
 * Availability calendar with the nightly price in each day and range selection (B7).
 * A day stands for the night that starts on it; the check-out day may be the first night of another stay.
 */
export function AvailabilityCalendar({
  locale,
  currency,
  seasons,
  rates,
  busy,
  today,
  value,
  onChange,
  months = 2,
}: Props) {
  const t = useTranslations("guest.calendar");
  const busySet = useMemo(() => new Set(busy), [busy]);
  const [first, setFirst] = useState(monthStart(value.checkIn ?? today));
  const fmtMonth = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const fmtPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );

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

  /** Can the stay end on `date` (all nights from check-in free and the minimum met)? */
  const validCheckOut = (checkIn: IsoDate, date: IsoDate) => {
    if (date <= checkIn) return false;
    for (let d = checkIn; d < date; d = addDays(d, 1)) if (busySet.has(d)) return false;
    const min = info(checkIn).season?.minNights ?? 1;
    const nights = Math.round((Date.parse(date) - Date.parse(checkIn)) / 86_400_000);
    return nights >= min;
  };

  function pick(date: IsoDate) {
    const { checkIn, checkOut } = value;
    if (checkIn && !checkOut && validCheckOut(checkIn, date)) {
      onChange({ checkIn, checkOut: date });
      return;
    }
    const d = info(date);
    if (d.past || d.busy || !d.arrivalAllowed || d.rate === undefined) return;
    onChange({ checkIn: date, checkOut: null });
  }

  const selectingOut = Boolean(value.checkIn && !value.checkOut);
  const monthList = Array.from({ length: months }, (_, i) => addMonths(first, i));

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setFirst(addMonths(first, -1))}
          disabled={first <= monthStart(today)}
          aria-label={t("prev")}
        >
          <ChevronLeft />
        </Button>
        <p className="text-muted-foreground text-sm">
          {selectingOut ? t("selectCheckOut") : t("selectCheckIn")}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setFirst(addMonths(first, 1))}
          aria-label={t("next")}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className={cn("grid gap-6", months > 1 && "md:grid-cols-2")}>
        {monthList.map((month, mi) => (
          <div key={month} className={cn("grid gap-2", mi > 0 && "hidden md:grid")}>
            <p className="text-center text-sm font-medium capitalize">
              {fmtMonth.format(new Date(`${month}T00:00:00Z`))}
            </p>
            <div className="text-muted-foreground grid grid-cols-7 text-center text-xs">
              {weekdays.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysOfMonth(month).map((date, i) => {
                if (!date) return <span key={`e${i}`} />;
                const d = info(date);
                const inRange =
                  value.checkIn && value.checkOut && date > value.checkIn && date < value.checkOut;
                const isEdge = date === value.checkIn || date === value.checkOut;
                const outCandidate =
                  selectingOut && value.checkIn ? validCheckOut(value.checkIn, date) : false;
                const disabled = selectingOut
                  ? !outCandidate && (d.past || d.busy || !d.arrivalAllowed || d.rate === undefined)
                  : d.past || d.busy || !d.arrivalAllowed || d.rate === undefined;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(date)}
                    title={
                      d.busy
                        ? t("busy")
                        : !d.arrivalAllowed
                          ? t("arrivalNotAllowed")
                          : d.season
                            ? t("minNights", { count: d.season.minNights })
                            : undefined
                    }
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                      "hover:bg-accent disabled:hover:bg-transparent",
                      d.busy && "text-muted-foreground/60 line-through",
                      disabled && !d.busy && "text-muted-foreground/40",
                      inRange && "bg-primary/10",
                      isEdge && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    <span className="leading-none">{Number(date.slice(8))}</span>
                    {!d.past && !d.busy && d.rate !== undefined ? (
                      <span
                        className={cn(
                          "mt-0.5 text-[10px] leading-none",
                          !isEdge && "text-muted-foreground",
                        )}
                      >
                        {fmtPrice.format(d.rate / 100)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {value.checkIn ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-end"
          onClick={() => onChange({ checkIn: null, checkOut: null })}
        >
          {t("clear")}
        </Button>
      ) : null}
    </div>
  );
}
