import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { requireTenant } from "@/core/admin/action";
import { todayIso } from "@/core/pricing/dates";
import {
  change,
  periodMonths,
  shiftMonths,
  totals,
  type Change,
  type StatsPeriod,
} from "@/core/stats/compute";
import { loadMonthlyStats } from "@/core/stats/load";
import { RevenueChart } from "@/core/stats/revenue-chart";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function parsePeriod(value: string | string[] | undefined, year: number): StatsPeriod {
  if (value === "12m") return { kind: "12m" };
  const y = typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : year;
  return { kind: "year", year: y >= year - 5 && y <= year + 1 ? y : year };
}

/** Statistics of the owner (Z27, doska 09): period, comparison with last year, five numbers, chart and table. */
export default async function StatisticsPage({ searchParams }: PageProps<"/admin/statistics">) {
  const active = await requireTenant();
  const [t, locale, sp, tenant] = await Promise.all([
    getTranslations("stats"),
    getLocale(),
    searchParams,
    getTenantInfo(active.tenantId),
  ]);
  const today = todayIso(tenant.timezone);
  const year = Number(today.slice(0, 4));
  const period = parsePeriod(sp.period, year);
  const compare = sp.compare !== "0";
  const { from, to } = periodMonths(period, today);
  const supabase = await createClient();
  const [rows, previous, { data: settings }] = await Promise.all([
    loadMonthlyStats(tenant.id, from, to),
    loadMonthlyStats(tenant.id, shiftMonths(from, -12), shiftMonths(to, -12)),
    supabase
      .from("tenant_settings")
      .select("portal_commission_bp")
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
  ]);
  const canCompare = previous.some((r) => r.revenueCents > 0 || r.occupiedNights > 0);
  const showCompare = compare && canCompare;
  const now = totals(rows);
  const before = totals(previous);
  const bp = settings?.portal_commission_bp ?? 1500;
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: tenant.currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  const periodLabel = period.kind === "year" ? String(period.year) : t("last12");
  const previousLabel = period.kind === "year" ? String(period.year - 1) : t("previous12");
  const href = (p: string, c = compare) => `/admin/statistics?period=${p}${c ? "" : "&compare=0"}`;

  const delta = (c: Change) =>
    showCompare && c ? (
      <span className={c.direction === "up" ? "text-[#2f6b4f]" : "text-[#a8432f]"}>
        {c.direction === "up" ? "▲ +" : "▼ −"}
        {c.value}
        {c.unit === "%" ? " %" : ` ${t("points")}`} {t("versus", { period: previousLabel })}
      </span>
    ) : null;
  const kpis = [
    {
      label: t("kpiRevenue", { period: periodLabel }),
      value: money(now.revenueCents),
      sub: delta(change(now.revenueCents, before.revenueCents, "%")),
    },
    {
      label: t("reservations"),
      value: String(now.reservations),
      sub: delta(change(now.reservations, before.reservations, "%")),
    },
    {
      label: t("occupancy"),
      value: now.occupancy == null ? "—" : `${Math.round(now.occupancy)} %`,
      sub: delta(change(now.occupancy, before.occupancy, "pp")) ?? t("occupancyHint"),
    },
    {
      label: t("avgNight"),
      value: now.avgNightCents == null ? "—" : money(now.avgNightCents),
      sub: delta(change(now.avgNightCents, before.avgNightCents, "%")),
    },
    {
      label: t("saved"),
      value: `≈ ${money(Math.round((now.revenueCents * bp) / 10000))}`,
      sub: t("savedHint", { percent: bp / 100 }),
    },
  ];
  const periods = [
    { key: String(year), label: String(year) },
    { key: String(year - 1), label: String(year - 1) },
    { key: "12m", label: t("last12") },
  ];
  const currentKey = period.kind === "year" ? String(period.year) : "12m";

  return (
    <div data-bleed>
      <PageHeader
        kicker={tenant.name}
        title={t("title")}
        actions={
          <>
            <nav aria-label={t("period")} className="bg-muted flex rounded-full p-1">
              {periods.map((p) => (
                <Link
                  key={p.key}
                  href={href(p.key)}
                  aria-current={p.key === currentKey ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[34px] items-center rounded-full px-3.5 text-[13px]",
                    p.key === currentKey
                      ? "text-ink bg-background font-bold shadow-sm"
                      : "text-muted-foreground font-medium",
                  )}
                >
                  {p.label}
                </Link>
              ))}
            </nav>
            {canCompare ? (
              <Link
                href={href(currentKey, !compare)}
                role="switch"
                aria-checked={showCompare}
                className="text-ink flex min-h-10 items-center gap-2 text-[13px] font-medium"
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative h-[18px] w-8 rounded-full transition-colors",
                    showCompare ? "bg-primary" : "bg-[#d9d6ce]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-3.5 rounded-full bg-white transition-[left]",
                      showCompare ? "left-4" : "left-0.5",
                    )}
                  />
                </span>
                {t("compare", { period: previousLabel })}
              </Link>
            ) : (
              <span className="text-muted-foreground text-[13px]">{t("noCompare")}</span>
            )}
          </>
        }
      />
      <PageBody className="grid gap-6">
        <dl className="bg-card grid overflow-hidden rounded-[10px] border sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className={cn(
                "grid content-start gap-1.5 px-5 py-[18px]",
                i && "border-line-hair border-t sm:border-t-0 lg:border-l",
              )}
            >
              <dt className="text-muted-foreground text-[13px]">{k.label}</dt>
              <dd className="text-ink text-2xl font-extrabold tracking-tight tabular-nums">
                {k.value}
              </dd>
              {k.sub ? <dd className="text-muted-foreground text-[13px]">{k.sub}</dd> : null}
            </div>
          ))}
        </dl>
        <RevenueChart
          rows={rows}
          previous={showCompare ? previous : null}
          today={today}
          locale={locale}
          currency={tenant.currency}
          periodLabel={periodLabel}
          previousLabel={previousLabel}
        />
      </PageBody>
    </div>
  );
}
