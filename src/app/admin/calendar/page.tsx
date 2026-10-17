import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { loadOccupancy, loadSyncState } from "@/core/admin/occupancy";
import { OccupancyLegend, SyncLine } from "@/core/admin/occupancy-ui";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { getStaffCatalog } from "@/core/booking/staff-catalog";
import { seasonFor } from "@/core/pricing/calculate";
import { addDays, diffDays, todayIso } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { CalendarView, type CalendarDay } from "./calendar-view";
import { UnitPicker } from "./unit-picker";

function monthOf(v: string | string[] | undefined, today: string): string {
  const s = typeof v === "string" && /^\d{4}-\d{2}$/.test(v) ? v : today.slice(0, 7);
  return `${s}-01`;
}

function shiftMonth(first: string, n: number): string {
  const [y, m] = first.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
}

/**
 * 04 Occupancy calendar (B8, vizuál administrácie v1): two months next to each other, stays as bars from noon
 * to noon, prices in free days from the price list, a panel per bar and for selected free days.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const active = await requireTenant();
  const [t, locale, sp, tenant] = await Promise.all([
    getTranslations("adminV1.calendar"),
    getLocale(),
    searchParams,
    getTenantInfo(active.tenantId),
  ]);
  const today = todayIso(tenant.timezone);
  const first = monthOf(sp.month, today);
  const end = `${shiftMonth(first, 2)}-01`;
  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("id, name, sort, property:properties(name, booking_mode, sort)")
    .eq("tenant_id", active.tenantId)
    .eq("active", true);
  const sorted = [...(units ?? [])].sort(
    (a, b) =>
      (a.property?.sort ?? 0) - (b.property?.sort ?? 0) ||
      (a.property?.name ?? "").localeCompare(b.property?.name ?? "") ||
      a.sort - b.sort,
  );
  const unitLabel = (u: (typeof sorted)[number]) =>
    u.property?.booking_mode === "units"
      ? `${u.property.name} — ${u.name}`
      : (u.property?.name ?? u.name);
  const unit = sorted.find((u) => u.id === sp.unit) ?? sorted[0];

  const [events, staff, sync] = await Promise.all([
    unit ? loadOccupancy(active.tenantId, first, end) : Promise.resolve([]),
    unit ? getStaffCatalog(active.tenantId, unit.id) : Promise.resolve(null),
    loadSyncState(active.tenantId),
  ]);
  const unitEvents = events.filter((e) => e.unitId === unit?.id);
  // Calendar shows a few days around the two months (full weeks), so prices and bars cover them too.
  const gridFrom = addDays(first, -7);
  const gridTo = addDays(end, 7);
  const days: CalendarDay[] = Array.from({ length: diffDays(gridFrom, gridTo) }, (_, i) => {
    const date = addDays(gridFrom, i);
    const season = staff ? seasonFor(date, staff.catalog.seasons) : null;
    const rate = season ? staff?.catalog.rates[season.id] : undefined;
    return { date, priceCents: rate ?? null };
  });
  const monthName = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const months = [first, `${shiftMonth(first, 1)}-01`].map((m) => ({
    first: m,
    title: monthName.format(new Date(`${m}T00:00:00Z`)),
  }));

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/blocks">
                <CalendarOff /> {t("block")}
              </Link>
            </Button>
            <Button asChild className="font-bold">
              <Link href={`/admin/reservations/new${unit ? `?unit=${unit.id}` : ""}`}>
                <Plus /> {t("manual")}
              </Link>
            </Button>
          </>
        }
      />
      <div className="border-line flex flex-wrap items-center gap-3 border-b px-5 pb-4 md:px-10">
        {sorted.length > 1 ? (
          <UnitPicker
            label={t("unit")}
            value={unit?.id ?? ""}
            options={sorted.map((u) => ({ value: u.id, label: unitLabel(u) }))}
          />
        ) : unit ? (
          <span className="text-ink text-sm font-medium">{unitLabel(unit)}</span>
        ) : null}
        <OccupancyLegend className="md:ml-auto" />
      </div>
      <div className="grid gap-4 px-5 pt-5 pb-14 md:px-10">
        {unit ? (
          <CalendarView
            key={`${unit.id}-${first}`}
            unitId={unit.id}
            today={today}
            months={months}
            prevHref={`/admin/calendar?month=${shiftMonth(first, -1)}&unit=${unit.id}`}
            nextHref={`/admin/calendar?month=${shiftMonth(first, 1)}&unit=${unit.id}`}
            todayHref={`/admin/calendar?unit=${unit.id}`}
            days={days}
            events={unitEvents}
            currency={tenant.currency}
            locale={locale}
            timezone={tenant.timezone}
            sync={<SyncLine sync={sync} />}
            highlightId={typeof sp.highlight === "string" ? sp.highlight : undefined}
          />
        ) : (
          <p className="text-muted-foreground p-6">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
