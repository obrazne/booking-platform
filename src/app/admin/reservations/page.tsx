import { readPaging } from "@/core/admin/paging";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import {
  DateRangePill,
  FilterPills,
  ListSearch,
  Pagination,
  SortHeader,
} from "@/core/admin/data-list";
import { PageHeader } from "@/core/admin/page-header";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { StatusPill } from "@/core/admin/status";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import {
  queryReservations,
  reservationListParams,
  SOURCES,
  statusCounts,
  type ReservationStatus,
} from "./query";
import { loadReservationPanel } from "./panel-loader";

const PILL_STATUSES = ["pending_payment", "confirmed", "completed", "cancelled"] as const;

/** 03 Reservations (vizuál administrácie v1): state pills with counts, list, panel in two columns. */
/** Changes with every server render — tells the open panel to load its detail again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

/** "YYYY-MM" of the previous month (default of the monthly basis export). */
function previousMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const active = await requireTenant();
  const [t, tc, tv, ti, locale, sp, tenant] = await Promise.all([
    getTranslations("reservations"),
    getTranslations("common"),
    getTranslations("adminV1.reservations"),
    getTranslations("invoice"),
    getLocale(),
    searchParams,
    getTenantInfo(active.tenantId),
  ]);
  const paging = await readPaging(sp, "rezervacie");
  const params = { ...reservationListParams(sp), page: paging.page, pageSize: paging.size };
  const [{ rows, total }, counts] = await Promise.all([
    queryReservations(active.tenantId, params),
    statusCounts(active.tenantId, params),
  ]);
  const fmt = (cents: number, currency = tenant.currency) =>
    formatMoney(money(cents, currency), locale);
  const statusLabel = (s: string) => t(`statuses.${s as ReservationStatus}`);
  const sourceLabel = (s: string) => t(`sources.${s as (typeof SOURCES)[number]}`);
  const people = (r: { adults: number; children: number }) =>
    r.children
      ? tv("peopleWithChildren", { adults: r.adults, children: r.children })
      : t("panel.adults", { count: r.adults });
  const all = Object.values(counts).reduce((s, n) => s + n, 0);
  const exportQs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      typeof v === "string" && k !== "panel" ? [[k, v]] : [],
    ),
  ).toString();

  return (
    <div data-bleed>
      <PageHeader
        kicker={tenant.name}
        title={t("title")}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/reservations/export${exportQs ? `?${exportQs}` : ""}`} download>
                <Download /> {tc("exportCsv")}
              </a>
            </Button>
            {/* Podklady za mesiac for the accountant (Z51): the previous month is preselected. */}
            <form
              action="/admin/reservations/podklady"
              method="get"
              className="flex items-center gap-2"
            >
              <label htmlFor="basis-month" className="sr-only">
                {ti("monthLabel")}
              </label>
              <input
                id="basis-month"
                type="month"
                name="mesiac"
                required
                defaultValue={previousMonth()}
                title={ti("monthLabel")}
                className="border-input bg-background h-10 rounded-full border px-4 text-sm"
              />
              <Button type="submit" variant="outline">
                <Download /> {ti("monthExport")}
              </Button>
            </form>
            {/* "Ručná rezervácia" is in the top bar of every page (phone: the + button) — not twice here (Z58). */}
          </>
        }
      />
      <div className="border-line flex flex-wrap items-center gap-2.5 border-b px-5 pb-[18px] md:px-10">
        <ListSearch placeholder={tv("search")} className="w-full sm:w-72" />
        <FilterPills
          param="status"
          label={t("status")}
          options={[
            { value: "", label: tc("all"), count: all },
            ...PILL_STATUSES.map((s) => ({
              value: s,
              label: tv(`filters.${s}`),
              count: counts[s] ?? 0,
            })),
          ]}
        />
        <DateRangePill
          label={tv("arrival")}
          allLabel={tv("allDates")}
          fromLabel={t("filters.from")}
          toLabel={t("filters.to")}
          applyLabel={tv("apply")}
          clearLabel={tv("clear")}
        />
      </div>

      <div className="px-5 pb-14 md:px-10">
        <div className="overflow-x-auto">
          <div role="table" aria-label={t("title")} className="min-w-[760px]">
            <div
              role="row"
              className="border-line label-mono grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px_110px_150px] gap-4 border-b px-2 py-3"
            >
              <span role="columnheader">
                <SortHeader column="number">{t("number")}</SortHeader>
              </span>
              <span role="columnheader">{t("guest")}</span>
              <span role="columnheader">
                <SortHeader column="arrival_order">{tv("dates")}</SortHeader>
              </span>
              <span role="columnheader">{tv("people")}</span>
              <span role="columnheader" className="text-right">
                <SortHeader column="total_cents">{tv("amount")}</SortHeader>
              </span>
              <span role="columnheader">{t("status")}</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">{tc("noResults")}</p>
            ) : (
              rows.map((r) => {
                const item = r.items[0];
                return (
                  <PanelLink
                    key={r.id}
                    type="reservation"
                    id={r.id}
                    role="row"
                    className="border-line grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px_110px_150px] items-center gap-4 border-b px-2 py-4 transition-colors hover:bg-[#fbfaf7]"
                  >
                    <span role="cell" className="text-ink font-mono text-[13px]">
                      {r.number}
                    </span>
                    <span role="cell" className="grid min-w-0 gap-0.5">
                      <span className="text-ink inline-flex items-center gap-1.5 truncate text-[15px] font-bold">
                        {r.cancellation_requested_at ? (
                          <AlertTriangle
                            className="size-4 shrink-0 text-[#c07a3e]"
                            aria-label={t("panel.cancelRequest")}
                          />
                        ) : null}
                        {r.guest_name}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">{sourceLabel(r.source)}</span>
                    </span>
                    <span role="cell" className="grid gap-0.5">
                      <span className="text-ink text-sm font-medium">
                        {item
                          ? `${formatDate(item.check_in, locale, "short")} – ${formatDate(item.check_out, locale, "short")}`
                          : ""}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">
                        {item
                          ? t("nights", { count: diffDays(item.check_in, item.check_out) })
                          : ""}
                      </span>
                    </span>
                    <span role="cell" className="text-sm font-normal">
                      {people(r)}
                    </span>
                    <span
                      role="cell"
                      className="text-ink text-right text-[15px] font-bold tabular-nums"
                    >
                      {fmt(r.total_cents, r.currency)}
                    </span>
                    <span role="cell">
                      <StatusPill status={r.status} label={statusLabel(r.status)} />
                    </span>
                  </PanelLink>
                );
              })
            )}
          </div>
        </div>
        <p className="mx-2 mt-4 text-[13px] text-[#5a6672]">{tv("portalNote")}</p>
        <div className="mt-6">
          <Pagination
            page={params.page}
            pageSize={params.pageSize}
            total={total}
            list="rezervacie"
          />
        </div>
      </div>

      <UrlPanel
        type="reservation"
        load={loadReservationPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
