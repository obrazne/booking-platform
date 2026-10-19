import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { FilterPills, ListSearch, Pagination, SortHeader } from "@/core/admin/data-list";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { readPaging } from "@/core/admin/paging";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { formatDate, formatMoney } from "@/core/format/format";
import { guestCounts, guestListParams, queryGuests } from "@/core/guests/query";
import { money } from "@/core/money/money";
import { getTenantInfo } from "@/core/tenant/info";
import { cn } from "@/lib/utils";
import { loadGuestPanel } from "./panel-loader";
import { GuestsActions } from "./toolbar";

/** Changes with every server render — tells the open panel to load its card again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

const COLS =
  "grid-cols-[minmax(200px,2.2fr)_minmax(120px,1.3fr)_70px_minmax(120px,1fr)_minmax(90px,1fr)_70px]";

/**
 * Rezervácie › Hostia (Z68, v1.6, doska 17): every direct guest (and those added by hand) with phone, stays, the last
 * or next stay, the total spent and the consent with offers. Filters, search, sorting and paging in the database
 * (rule 7); a row opens the guest's card. Guests from portals are not here — portals do not give their contacts.
 */
export default async function GuestsPage({ searchParams }: PageProps<"/admin/guests">) {
  const active = await requireTenant();
  const sp = await searchParams;
  const paging = await readPaging(sp, "hostia");
  const p = { ...guestListParams(sp), page: paging.page, pageSize: paging.size };
  const [t, locale, tenant, list, counts] = await Promise.all([
    getTranslations("guests"),
    getLocale(),
    getTenantInfo(active.tenantId),
    queryGuests(active.tenantId, p),
    guestCounts(active.tenantId),
  ]);
  const date = (d: string) => formatDate(d, locale, "short");

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
        help="guests"
        actions={<GuestsActions consent={counts.consent} all={counts.all} />}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-3xl text-sm">{t("lead")}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterPills
            param="filter"
            label={t("filterLabel")}
            options={[
              { value: "", label: t("filters.all"), count: counts.all },
              { value: "returning", label: t("filters.returning"), count: counts.returning },
              { value: "consent", label: t("filters.consent"), count: counts.consent },
              { value: "upcoming", label: t("filters.upcoming"), count: counts.upcoming },
            ]}
          />
          <ListSearch placeholder={t("search")} className="md:ml-auto md:w-80" />
        </div>

        {list.rows.length ? (
          <div className="surface overflow-x-auto">
            <div role="table" aria-label={t("title")} className="min-w-[820px]">
              <div
                role="row"
                className={cn("border-hair label-mono grid gap-4 border-b px-5 py-3", COLS)}
              >
                <span role="columnheader">
                  <SortHeader column="name">{t("cols.guest")}</SortHeader>
                </span>
                <span role="columnheader">{t("cols.phone")}</span>
                <span role="columnheader">
                  <SortHeader column="stays">{t("cols.stays")}</SortHeader>
                </span>
                <span role="columnheader">
                  <SortHeader column="last_stay">{t("cols.last")}</SortHeader>
                </span>
                <span role="columnheader" className="text-right">
                  <SortHeader column="spent">{t("cols.spent")}</SortHeader>
                </span>
                <span role="columnheader">{t("cols.consent")}</span>
              </div>
              {list.rows.map((g) => (
                <PanelLink
                  key={g.id}
                  type="guest"
                  id={g.id}
                  role="row"
                  className={cn(
                    "border-hair grid items-center gap-4 border-b px-5 py-3 transition-colors last:border-b-0 hover:bg-[#faf9f6]",
                    COLS,
                  )}
                >
                  <span role="cell" className="grid min-w-0 gap-0.5">
                    <span className="text-ink truncate text-[14.5px] font-medium">
                      {g.name || g.email}
                    </span>
                    <span className="truncate text-[12.5px] text-[#5a6672]">{g.email}</span>
                  </span>
                  <span role="cell" className="truncate text-sm">
                    {g.phone ?? "—"}
                  </span>
                  <span role="cell" className="text-ink text-sm">
                    {g.stays}
                  </span>
                  <span role="cell" className="text-sm">
                    {g.nextStay ? (
                      <span className="text-[#2f5d50]">
                        {t("next", { date: date(g.nextStay) })}
                      </span>
                    ) : g.lastStay ? (
                      date(g.lastStay)
                    ) : (
                      "—"
                    )}
                  </span>
                  <span role="cell" className="text-ink text-right text-sm font-medium">
                    {g.spentCents ? formatMoney(money(g.spentCents, tenant.currency), locale) : "—"}
                  </span>
                  <span
                    role="cell"
                    className={cn(
                      "text-[13px] font-medium",
                      g.consent ? "text-[#2b6a50]" : "text-[#5a6672]",
                    )}
                  >
                    {g.consent ? t("yes") : "—"}
                  </span>
                </PanelLink>
              ))}
            </div>
            <div className="border-hair border-t px-5 py-2">
              <Pagination page={p.page} pageSize={p.pageSize} total={list.total} list="hostia" />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-sm">
            {counts.all ? t("emptyFilter") : t("empty")}
          </p>
        )}
        <p className="max-w-3xl text-[12.5px] leading-relaxed text-[#5a6672]">{t("portalNote")}</p>
      </div>
      <UrlPanel
        type="guest"
        load={loadGuestPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
