"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  axisTop,
  extremes,
  lastStartedIndex,
  linePath,
  monthOccupancy,
  type MonthStat,
} from "./compute";

const BOX = { x0: 64, x1: 1036, y0: 250, y1: 22 };

/**
 * Revenue by month (v1.2): solid line = months that have started, dotted = confirmed stays still ahead, grey = last
 * year; strongest and weakest month labelled; a click on a month shows a bubble and highlights its table row.
 * The table is the text alternative of the chart.
 */
export function RevenueChart({
  rows,
  previous,
  today,
  locale,
  currency,
  periodLabel,
  previousLabel,
}: {
  rows: MonthStat[];
  /** Same months a year earlier, when comparing. */
  previous: MonthStat[] | null;
  today: string;
  locale: string;
  currency: string;
  periodLabel: string;
  previousLabel: string;
}) {
  const t = useTranslations("stats");
  const done = lastStartedIndex(rows, today);
  const [selected, setSelected] = useState(Math.max(done, 0));
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      cents / 100,
    );
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const monthLong = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const label = (iso: string, f: Intl.DateTimeFormat) => f.format(new Date(`${iso}T00:00:00Z`));

  const values = rows.map((r) => r.revenueCents);
  const prevValues = previous?.map((r) => r.revenueCents) ?? null;
  const top = axisTop(Math.max(...values, ...(prevValues ?? []), 0));
  const n = Math.max(rows.length - 1, 1);
  const px = (i: number) => BOX.x0 + ((BOX.x1 - BOX.x0) * i) / n;
  const py = (v: number) => BOX.y0 - ((BOX.y0 - BOX.y1) * v) / top;
  const colW = (BOX.x1 - BOX.x0) / n;
  const past = done >= 0 ? linePath(values, 0, done, top, BOX) : "";
  const future = linePath(values, Math.max(done, 0), rows.length - 1, top, BOX);
  const area =
    done >= 0 ? `${past} L${px(done).toFixed(1)} ${BOX.y0} L${px(0).toFixed(1)} ${BOX.y0} Z` : "";
  const prevPath = prevValues ? linePath(prevValues, 0, prevValues.length - 1, top, BOX) : "";
  const { strongest, weakest } = extremes(rows, today);
  const tag = (i: number, text: string) => {
    const w = text.length * 6.6 + 18;
    const cx = Math.min(Math.max(px(i), BOX.x0 + w / 2), BOX.x1 - w / 2);
    return { x: cx - w / 2, y: py(values[i]!) - 34, w, tx: cx, ty: py(values[i]!) - 20, text };
  };
  const tags = [
    strongest != null ? { ...tag(strongest, t("strongest")), strong: true } : null,
    weakest != null ? { ...tag(weakest, t("weakest")), strong: false } : null,
  ].filter((x) => x != null);
  const grid = [0, 1, 2, 3, 4].map((j) => top * (j / 4));
  const sel = rows[selected];
  const prevSel = previous?.[selected];
  const summary = t("chartSummary", {
    period: periodLabel,
    total: money(values.reduce((a, b) => a + b, 0)),
    strongest: strongest != null ? label(rows[strongest]!.month, monthLong) : "—",
    weakest: weakest != null ? label(rows[weakest]!.month, monthLong) : "—",
  });
  const leftPct = Math.min(Math.max((px(selected) / 1060) * 100, 8), 82);

  return (
    <div className="grid gap-6">
      <section className="bg-card grid gap-3 rounded-[10px] border p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-ink text-lg font-bold">{t("chartTitle")}</h2>
            <p className="text-muted-foreground text-[13px]">{t("chartHint")}</p>
          </div>
          <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
            <li className="flex items-center gap-1.5">
              <span className="bg-primary inline-block h-0.5 w-5" aria-hidden />
              {periodLabel}
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="border-primary inline-block w-5 border-t-2 border-dotted"
                aria-hidden
              />
              {t("legendFuture")}
            </li>
            {prevValues ? (
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 bg-[#b9bdc3]" aria-hidden />
                {previousLabel}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="relative overflow-x-auto">
          <svg
            viewBox="0 0 1060 280"
            role="img"
            aria-label={summary}
            className="block w-full min-w-[640px]"
          >
            {grid.map((v) => (
              <g key={v}>
                <line x1={BOX.x0} x2={BOX.x1} y1={py(v)} y2={py(v)} stroke="#ecebe6" />
                <text x={BOX.x0 - 10} y={py(v) + 4} textAnchor="end" fontSize="11" fill="#8b929b">
                  {v ? money(v) : "0"}
                </text>
              </g>
            ))}
            {rows.map((r, i) => (
              <g key={r.month}>
                <rect
                  x={px(i) - colW / 2}
                  y={BOX.y1 - 10}
                  width={colW}
                  height={BOX.y0 - BOX.y1 + 34}
                  fill={
                    i === selected
                      ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                      : "transparent"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelected(i)}
                />
                <text
                  x={px(i)}
                  y={BOX.y0 + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill={i === selected ? "#11212f" : "#8b929b"}
                  fontWeight={i === selected ? 700 : 400}
                  pointerEvents="none"
                >
                  {label(r.month, monthShort)}
                </text>
              </g>
            ))}
            {prevPath ? <path d={prevPath} fill="none" stroke="#b9bdc3" strokeWidth="2" /> : null}
            {area ? (
              <path
                d={area}
                fill="color-mix(in srgb, var(--primary) 8%, transparent)"
                pointerEvents="none"
              />
            ) : null}
            {past ? (
              <path
                d={past}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                pointerEvents="none"
              />
            ) : null}
            {future && done < rows.length - 1 ? (
              <path
                d={future}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeDasharray="2 5"
                strokeLinecap="round"
                pointerEvents="none"
              />
            ) : null}
            {values.map((v, i) => (
              <circle
                key={rows[i]!.month}
                cx={px(i)}
                cy={py(v)}
                r={i === selected ? 6 : 3.5}
                fill={i === selected ? "var(--primary)" : "#ffffff"}
                stroke="var(--primary)"
                strokeWidth="2"
                pointerEvents="none"
              />
            ))}
            {tags.map((g) => (
              <g key={g.text} pointerEvents="none">
                <rect
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={20}
                  rx={10}
                  fill={g.strong ? "color-mix(in srgb, var(--primary) 12%, white)" : "#f1efe9"}
                />
                <text
                  x={g.tx}
                  y={g.ty + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={g.strong ? "var(--primary)" : "#5a6672"}
                >
                  {g.text}
                </text>
              </g>
            ))}
          </svg>
          {sel ? (
            <div
              role="status"
              className="bg-background pointer-events-none absolute top-2 grid w-[190px] gap-1 rounded-[10px] border p-3 text-[13px] shadow-lg"
              style={{
                left: `calc(${leftPct}% + ${px(selected) > 800 ? "-210px" : "18px"})`,
              }}
            >
              <strong className="text-ink">
                {label(sel.month, monthLong)}
                {selected > done ? ` · ${t("confirmed")}` : ""}
              </strong>
              <span className="flex justify-between gap-2">
                {t("revenue")} <b>{money(sel.revenueCents)}</b>
              </span>
              {prevSel ? (
                <span className="text-muted-foreground flex justify-between gap-2">
                  {previousLabel} <span>{money(prevSel.revenueCents)}</span>
                </span>
              ) : null}
              <span className="flex justify-between gap-2">
                {t("occupancy")} <span>{monthOccupancy(sel) ?? 0} %</span>
              </span>
              <span className="flex justify-between gap-2">
                {t("reservations")} <span>{sel.reservations}</span>
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">{t("tableCaption", { period: periodLabel })}</caption>
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-2 py-2.5 font-medium">{t("month")}</th>
              <th className="px-2 py-2.5 text-right font-medium">{t("revenue")}</th>
              <th className="px-2 py-2.5 text-right font-medium">
                {prevValues ? previousLabel : "—"}
              </th>
              <th className="px-2 py-2.5 text-right font-medium">{t("reservations")}</th>
              <th className="px-2 py-2.5 text-right font-medium">{t("occupancy")}</th>
              <th className="px-2 py-2.5 text-right font-medium">{t("avgNight")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.month}
                onClick={() => setSelected(i)}
                className={cn(
                  "border-line-hair cursor-pointer border-b",
                  i === selected && "bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
                  i > done && "text-ink-soft",
                )}
              >
                <th scope="row" className="px-2 py-2.5 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={i === selected}
                    className="first-letter:uppercase"
                  >
                    {label(r.month, monthLong)}
                  </button>
                  {i > done ? (
                    <span className="text-muted-foreground"> · {t("confirmed")}</span>
                  ) : null}
                  {i === strongest || i === weakest ? (
                    <span
                      className={cn(
                        "ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                        i === strongest
                          ? "text-primary bg-[color-mix(in_srgb,var(--primary)_12%,white)]"
                          : "bg-[#f1efe9] text-[#5a6672]",
                      )}
                    >
                      {i === strongest ? t("strongest") : t("weakest")}
                    </span>
                  ) : null}
                </th>
                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                  {money(r.revenueCents)}
                </td>
                <td className="text-muted-foreground px-2 py-2.5 text-right tabular-nums">
                  {previous?.[i] ? money(previous[i]!.revenueCents) : "—"}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.reservations}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{monthOccupancy(r) ?? 0} %</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {r.nightsSold ? money(Math.round(r.revenueCents / r.nightsSold)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-foreground mt-3 text-[13px]">{t("origin")}</p>
      </section>
    </div>
  );
}
