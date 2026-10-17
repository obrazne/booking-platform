import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Clock, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kindsByNight, loadOccupancy, loadSyncState } from "@/core/admin/occupancy";
import { OccupancyLegend, SyncLine } from "@/core/admin/occupancy-ui";
import { OCCUPANCY_CLASS, StatusPill } from "@/core/admin/status";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { ModuleSlot } from "@/core/modules/module-slot";
import { addDays, diffDays, isoWeekday, todayIso } from "@/core/pricing/dates";
import { getActiveMembership } from "@/core/tenant/active";
import { getGuestSiteUrl, getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MarkPaidButton } from "./reservations/quick-actions";

const OPEN = ["pending_payment", "confirmed", "in_progress"];
const PAID = ["confirmed", "in_progress", "completed"];

function hourIn(timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(
      new Date(),
    ),
  );
}

/** 02 Owner's overview (B8, vizuál administrácie v1). */
export default async function AdminDashboard() {
  const t = await getTranslations("adminV1.overview");
  const ta = await getTranslations("admin");
  const tr = await getTranslations("reservations");
  const active = await getActiveMembership();
  if (!active) return <p className="text-muted-foreground max-w-prose p-8">{ta("noMembership")}</p>;

  const [locale, tenant, guestUrl] = await Promise.all([
    getLocale(),
    getTenantInfo(active.tenantId),
    getGuestSiteUrl(active.tenantId),
  ]);
  const today = todayIso(tenant.timezone);
  const year = today.slice(0, 4);
  const horizon = addDays(today, 90);
  const weekStart = addDays(today, 1 - isoWeekday(today));
  const mapEnd = addDays(weekStart, 12 * 7);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    profile,
    settings,
    units,
    yearRows,
    upcoming,
    waiting,
    requests,
    events,
    horizonEvents,
    sync,
  ] = await Promise.all([
    user
      ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("tenant_settings")
      .select("portal_commission_bp")
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
    supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("active", true),
    supabase
      .from("reservations")
      .select("status, total_cents")
      .eq("tenant_id", tenant.id)
      .in("source", ["direct", "manual"])
      .neq("status", "cancelled")
      .gte("created_at", `${year}-01-01`),
    supabase
      .from("reservations")
      .select(
        "id, number, status, guest_name, adults, children, items:reservation_items!inner(check_in, check_out)",
      )
      .eq("tenant_id", tenant.id)
      .in("status", OPEN)
      .gte("items.check_in", today)
      .limit(30),
    supabase
      .from("reservations")
      .select(
        "id, number, guest_name, total_cents, currency, payment_due_at, items:reservation_items(check_in, check_out)",
      )
      .eq("tenant_id", tenant.id)
      .eq("status", "pending_payment")
      .order("payment_due_at"),
    supabase
      .from("reservations")
      .select("id, number, guest_name, cancellation_request_note")
      .eq("tenant_id", tenant.id)
      .not("cancellation_requested_at", "is", null)
      .in("status", ["pending_payment", "confirmed"]),
    loadOccupancy(tenant.id, weekStart, mapEnd),
    loadOccupancy(tenant.id, today, horizon),
    loadSyncState(tenant.id),
  ]);

  const first = (profile.data?.full_name ?? "").split(" ")[0] || null;
  const h = hourIn(tenant.timezone);
  const part = h >= 5 && h < 10 ? "morning" : h >= 10 && h < 18 ? "day" : "evening";
  const pending = waiting.data ?? [];
  const asks = requests.data ?? [];
  const rows = yearRows.data ?? [];
  const revenue = rows
    .filter((r) => PAID.includes(r.status))
    .reduce((s, r) => s + r.total_cents, 0);
  const bp = settings.data?.portal_commission_bp ?? 1500;
  const saved = Math.round((revenue * bp) / 10000);
  const nightsTotal = 90 * Math.max(1, units.count ?? 1);
  const busy = horizonEvents
    .filter((e) => e.kind !== "block")
    .reduce(
      (s, e) =>
        s +
        diffDays(
          e.checkIn < today ? today : e.checkIn,
          e.checkOut > horizon ? horizon : e.checkOut,
        ),
      0,
    );
  const fmt = (cents: number, currency = tenant.currency) =>
    formatMoney(money(cents, currency), locale);
  const nextStays = (upcoming.data ?? [])
    .map((r) => ({ ...r, item: r.items[0]! }))
    .sort((a, b) => a.item.check_in.localeCompare(b.item.check_in))
    .slice(0, 3);
  const map = kindsByNight(events, weekStart, mapEnd);
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tenant.timezone,
  });

  return (
    <div data-bleed>
      <header className="border-line hidden flex-wrap items-center justify-between gap-4 border-b px-10 py-[22px] md:flex">
        <form action="/admin/reservations" className="flex-[0_1_380px]">
          <label className="bg-muted text-muted-foreground flex min-h-[42px] items-center gap-2.5 rounded-full px-3.5 text-sm">
            <Search className="size-4" />
            <input
              type="search"
              name="q"
              placeholder={t("search")}
              aria-label={t("search")}
              className="text-ink min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
        </form>
        <div className="flex items-center gap-2.5">
          {guestUrl ? (
            <Button asChild variant="outline">
              <a href={guestUrl} target="_blank" rel="noreferrer">
                {t("guestPage")} <ArrowUpRight />
              </a>
            </Button>
          ) : null}
          <Button asChild className="font-bold">
            <Link href="/admin/reservations/new">
              <Plus /> {tr("new")}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid w-full max-w-[1180px] gap-9 px-5 pt-7 pb-14 md:px-10 md:pt-9">
        <div className="grid gap-2">
          <span className="kicker text-brand-secondary first-letter:uppercase">
            {longDate.format(new Date())}
          </span>
          <h1 className="text-ink text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em] md:text-4xl">
            {t(`greeting.${part}`, { name: first ?? "none" })}{" "}
            <span className="text-ink-soft">
              {pending.length + asks.length
                ? t("waitingCount", { count: pending.length + asks.length })
                : t("allDone")}
            </span>
          </h1>
        </div>

        {pending.length + asks.length ? (
          <section aria-label={t("waitingLabel")} className="grid gap-2.5">
            {asks.map((r) => (
              <div
                key={r.id}
                className="card-warm flex flex-wrap items-center justify-between gap-4 rounded-[10px] px-[22px] py-5"
              >
                <span className="grid gap-0.5">
                  <span className="text-ink text-base font-bold">
                    {t("requestTitle", { number: r.number })}
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {r.guest_name}
                    {r.cancellation_request_note ? ` · ${r.cancellation_request_note}` : ""}
                  </span>
                </span>
                <Button asChild variant="outline" className="border-[#e3d3c0]">
                  <Link href={`/admin/reservations?panel=reservation:${r.id}`}>{t("open")}</Link>
                </Button>
              </div>
            ))}
            {pending.map((r) => {
              const item = r.items[0];
              return (
                <div
                  key={r.id}
                  className="card-warm flex flex-wrap items-center justify-between gap-4 rounded-[10px] px-[22px] py-5"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f6ecdf] text-[#8a4a22]">
                      <Clock className="size-5" />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-ink text-base font-bold">
                        {t("waitingTitle", {
                          number: r.number,
                          amount: fmt(r.total_cents, r.currency),
                        })}
                      </span>
                      <span className="text-muted-foreground text-sm font-normal">
                        {r.guest_name}
                        {item
                          ? ` · ${formatDate(item.check_in, locale, "short")} – ${formatDate(item.check_out, locale, "short")}`
                          : ""}
                        {r.payment_due_at
                          ? ` · ${t("dueThen", { date: formatDateTime(r.payment_due_at, locale, tenant.timezone, "short") })}`
                          : ""}
                      </span>
                    </span>
                  </div>
                  <div className="flex w-full gap-2.5 sm:w-auto">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 border-[#e3d3c0] sm:flex-none"
                    >
                      <Link href={`/admin/reservations?panel=reservation:${r.id}`}>
                        {t("open")}
                      </Link>
                    </Button>
                    <MarkPaidButton
                      id={r.id}
                      amountLabel={fmt(r.total_cents, r.currency)}
                      className="flex-1 font-bold sm:flex-none"
                    />
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        <section
          aria-label={t("numbers")}
          className="border-line grid grid-cols-2 overflow-hidden rounded-[10px] border lg:grid-cols-4"
        >
          <Stat
            label={t("statDirect", { year })}
            value={String(rows.length)}
            note={t("statDirectNote", {
              count: rows.filter((r) => r.status === "pending_payment").length,
            })}
          />
          <Stat
            label={t("statRevenue", { year })}
            value={fmt(revenue)}
            note={t("statRevenueNote")}
            className="border-line border-l"
          />
          <Stat
            label={t("statSaved")}
            value={`≈ ${fmt(saved)}`}
            note={t("statSavedNote", { percent: bp / 100 })}
            accent
            className="border-line border-t lg:border-t-0 lg:border-l"
          />
          <Stat
            label={t("statOccupied")}
            value={`${Math.round((busy / nightsTotal) * 100)} %`}
            note={t("statOccupiedNote", { busy, total: nightsTotal })}
            className="border-line border-t border-l lg:border-t-0"
          />
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="grid gap-3.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-ink text-xl font-extrabold tracking-tight">{t("upcoming")}</h2>
              <Link
                href="/admin/reservations"
                className="text-ink text-sm font-medium hover:underline"
              >
                {t("allReservations")} →
              </Link>
            </div>
            <div className="border-line border-t">
              {nextStays.length === 0 ? (
                <p className="text-muted-foreground py-6 text-sm">{t("noUpcoming")}</p>
              ) : (
                nextStays.map((r) => (
                  <Link
                    key={r.id}
                    href={`/admin/reservations?panel=reservation:${r.id}`}
                    className="border-line grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-b px-1.5 py-3.5 transition-colors hover:bg-[#fbfaf7]"
                  >
                    <span className="bg-muted flex flex-col items-center rounded-lg py-2">
                      <span className="text-ink text-xl leading-none font-extrabold">
                        {Number(r.item.check_in.slice(8))}
                      </span>
                      <span className="label-mono mt-1">
                        {monthShort
                          .format(new Date(`${r.item.check_in}T00:00:00Z`))
                          .replace(".", "")}
                      </span>
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-ink truncate text-[15px] font-bold">
                        {r.guest_name}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {t("guests", { count: r.adults + r.children })}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[13px] font-normal">
                        {formatDate(r.item.check_in, locale, "short")} –{" "}
                        {formatDate(r.item.check_out, locale, "short")} ·{" "}
                        {tr("nights", { count: diffDays(r.item.check_in, r.item.check_out) })}
                      </span>
                    </span>
                    <StatusPill
                      status={r.status}
                      label={tr(`statuses.${r.status as "confirmed"}`)}
                    />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-3.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-ink text-xl font-extrabold tracking-tight">{t("occupancy")}</h2>
              <Link href="/admin/calendar" className="text-ink text-sm font-medium hover:underline">
                {t("calendar")} →
              </Link>
            </div>
            <div className="border-line grid gap-3 rounded-[10px] border p-[18px]">
              {Array.from({ length: 12 }, (_, w) => {
                const mon = addDays(weekStart, w * 7);
                return (
                  <div
                    key={mon}
                    className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] items-center gap-1"
                  >
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {formatDate(mon, locale, "dayMonth")}
                    </span>
                    {Array.from({ length: 7 }, (_, d) => {
                      const day = addDays(mon, d);
                      const kind = map.get(day);
                      return (
                        <span
                          key={day}
                          title={formatDate(day, locale, "short")}
                          className={cn(
                            "h-5 rounded",
                            kind
                              ? OCCUPANCY_CLASS[kind]
                              : day < today
                                ? "border border-[#ebe8e1] bg-[#f4f3ef]"
                                : "border border-[#ebe8e1] bg-white dark:bg-transparent",
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
              <OccupancyLegend className="border-line border-t pt-2.5" />
            </div>
            <SyncLine sync={sync} />
          </section>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ModuleSlot name="admin.dashboard.cards" tenantId={active.tenantId} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  accent,
  className,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid content-start gap-2 px-6 py-[22px]",
        accent && "bg-accent-soft",
        className,
      )}
    >
      <span className={cn("label-mono", accent && "!text-primary")}>{label}</span>
      <span
        className={cn(
          "text-ink text-2xl leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap tabular-nums xl:text-[32px]",
          accent && "text-primary",
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-[13px] font-normal">{note}</span>
    </div>
  );
}
