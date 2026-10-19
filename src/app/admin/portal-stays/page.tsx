import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { FilterPills, Pagination } from "@/core/admin/data-list";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { readPaging } from "@/core/admin/paging";
import { queryPortalStays } from "@/core/admin/portal-stays";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { formatDate, formatDateTime } from "@/core/format/format";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { closedOnPortal } from "../collisions/panel-content";
import { PORTAL_NAMES } from "./panel-content";
import { loadPortalStayPanel } from "./panel-loader";

/** Changes with every server render — tells the open panel to load its detail again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

const PORTALS = ["booking", "airbnb", "other"] as const;

/**
 * Rezervácie › Z portálov (Z58): stays from the iCal calendars of Booking, Airbnb and others, apart from the platform's
 * own reservations — portal, dates, nights, code / link and the phone's last digits (when the portal sends them),
 * collision, last synchronisation. A row opens the panel; nothing is written to reservations.
 */
export default async function PortalStaysPage({ searchParams }: PageProps<"/admin/portal-stays">) {
  const active = await requireTenant();
  const [t, tr, locale, tenant, sp] = await Promise.all([
    getTranslations("portalStays"),
    getTranslations("reservations"),
    getLocale(),
    getTenantInfo(active.tenantId),
    searchParams,
  ]);
  const portal = PORTALS.find((p) => p === sp.portal) ?? "";
  const when = sp.when === "past" ? "past" : "future";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(new Date());
  // One page from the database (rule 7); the pills count in SQL.
  const paging = await readPaging(sp, "portaly");
  const { stays, total, counts } = await queryPortalStays(active.tenantId, {
    when,
    portal,
    today,
    from: paging.from,
    to: paging.to,
  });
  const any = counts.future + counts.past > 0;
  const portalName = (p: string) => PORTAL_NAMES[p] ?? t("other");

  return (
    <div data-bleed>
      <PageHeader
        help="portalStays"
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <FilterPills
            param="when"
            label={t("when")}
            options={[
              {
                value: "",
                label: t("future"),
                count: counts.future,
              },
              {
                value: "past",
                label: t("past"),
                count: counts.past,
              },
            ]}
          />
          <FilterPills
            param="portal"
            label={t("portal")}
            options={[
              { value: "", label: t("allPortals"), count: counts[when] },
              ...PORTALS.filter((p) => p in counts.portals).map((p) => ({
                value: p,
                label: portalName(p),
                count: counts.portals[p] ?? 0,
              })),
            ]}
          />
        </div>

        {stays.length ? (
          <div className="overflow-x-auto">
            <div role="table" aria-label={t("title")} className="min-w-[760px]">
              <div
                role="row"
                className="border-line label-mono grid grid-cols-[140px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_150px] gap-4 border-b px-2 py-3"
              >
                <span role="columnheader">{t("portal")}</span>
                <span role="columnheader">{t("dates")}</span>
                <span role="columnheader">{t("unit")}</span>
                <span role="columnheader">{t("reference")}</span>
                <span role="columnheader">{t("lastSync")}</span>
              </div>
              {stays.map((s) => (
                <PanelLink
                  key={s.id}
                  type="portal-stay"
                  id={s.id}
                  role="row"
                  className="border-line grid grid-cols-[140px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_150px] items-center gap-4 border-b px-2 py-3.5 transition-colors hover:bg-[#fbfaf7]"
                >
                  <span role="cell" className="grid gap-0.5">
                    <span className="text-ink text-[15px] font-bold">{portalName(s.portal)}</span>
                    <span className="truncate text-[12px] text-[#5a6672]">{s.channelName}</span>
                  </span>
                  <span role="cell" className="grid gap-0.5">
                    <span className="text-ink text-[15px]">
                      {formatDate(s.checkIn, locale, "short")} –{" "}
                      {formatDate(s.checkOut, locale, "short")}
                    </span>
                    <span className="text-[13px] text-[#5a6672]">
                      {tr("nights", { count: diffDays(s.checkIn, s.checkOut) })}
                      {closedOnPortal(s.label) ? ` · ${t("closed")}` : ""}
                    </span>
                  </span>
                  <span role="cell" className="min-w-0 truncate text-sm">
                    {s.unitName}
                  </span>
                  <span
                    role="cell"
                    className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                  >
                    {s.code ? (
                      <span className="font-mono text-[13px]">{t("code", { code: s.code })}</span>
                    ) : null}
                    {s.phone4 ? (
                      <span className="text-[#5a6672]">{t("phone", { digits: s.phone4 })}</span>
                    ) : null}
                    {!s.code && !s.phone4 ? <span className="text-[#5a6672]">—</span> : null}
                    {s.conflict ? (
                      <span className="rounded-full bg-[#f6ecdf] px-2 py-0.5 text-xs font-bold text-[#8a4a22]">
                        {t("collision")}
                      </span>
                    ) : null}
                  </span>
                  <span role="cell" className="text-[13px] text-[#5a6672]">
                    {s.lastSyncAt
                      ? formatDateTime(s.lastSyncAt, locale, tenant.timezone, "short")
                      : t("never")}
                  </span>
                </PanelLink>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-sm">
            {any ? t("emptyFilter") : t("empty")}
          </p>
        )}
        {total > 0 ? (
          <Pagination page={paging.page} pageSize={paging.size} total={total} list="portaly" />
        ) : null}
      </div>
      <UrlPanel
        type="portal-stay"
        load={loadPortalStayPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
