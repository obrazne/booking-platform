import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { axisTop, lastStartedIndex, linePath, type MonthStat } from "./compute";

const BOX = { x0: 12, x1: 1068, y0: 92, y1: 10 };

/** Overview (v1.2): small revenue chart of the last 12 months — the same calculation as Statistics. */
export async function MiniRevenueChart({
  rows,
  today,
  locale,
  currency,
}: {
  rows: MonthStat[];
  today: string;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations("stats");
  const values = rows.map((r) => r.revenueCents);
  const top = axisTop(Math.max(...values, 0));
  const done = lastStartedIndex(rows, today);
  const n = Math.max(rows.length - 1, 1);
  const px = (i: number) => BOX.x0 + ((BOX.x1 - BOX.x0) * i) / n;
  const past = done >= 0 ? linePath(values, 0, done, top, BOX) : "";
  const area =
    done >= 0 ? `${past} L${px(done).toFixed(1)} ${BOX.y0} L${px(0).toFixed(1)} ${BOX.y0} Z` : "";
  const total = values.reduce((a, b) => a + b, 0);
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(total / 100);
  const month = new Intl.DateTimeFormat(locale, { month: "narrow", timeZone: "UTC" });

  return (
    <section className="surface grid gap-2 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-ink text-base font-bold">{t("overviewTitle")}</h2>
        <Link href="/admin/statistics" className="text-primary text-sm font-bold">
          {t("overviewLink")} →
        </Link>
      </div>
      <p className="text-ink text-2xl font-extrabold tracking-tight tabular-nums">{money}</p>
      <svg
        viewBox="0 0 1080 112"
        role="img"
        aria-label={`${t("overviewTitle")}: ${money}`}
        className="block w-full"
      >
        {area ? <path d={area} fill="color-mix(in srgb, var(--primary) 8%, transparent)" /> : null}
        {past ? <path d={past} fill="none" stroke="var(--primary)" strokeWidth="2.5" /> : null}
        {done < rows.length - 1 ? (
          <path
            d={linePath(values, Math.max(done, 0), rows.length - 1, top, BOX)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
        ) : null}
        {rows.map((r, i) => (
          <text key={r.month} x={px(i)} y={110} textAnchor="middle" fontSize="11" fill="#8b929b">
            {month.format(new Date(`${r.month}T00:00:00Z`))}
          </text>
        ))}
      </svg>
    </section>
  );
}
