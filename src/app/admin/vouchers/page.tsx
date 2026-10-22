import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { FilterPills, ListSearch, Pagination, SortHeader } from "@/core/admin/data-list";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { readPaging } from "@/core/admin/paging";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { formatDate, formatMoney } from "@/core/format/format";
import {
  giftVoucherCounts,
  giftVoucherListParams,
  queryGiftVouchers,
} from "@/core/gift-vouchers/query";
import { giftVoucherState } from "@/core/gift-vouchers/state";
import { money } from "@/core/money/money";
import { todayIso } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { cn } from "@/lib/utils";
import { GiftVoucherPill } from "./pill";
import { loadGiftVoucherPanel } from "./panel-loader";
import { GiftVouchersActions } from "./toolbar";

/** Changes with every server render — tells the open panel to load the voucher again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

const COLS =
  "grid-cols-[minmax(170px,1.4fr)_minmax(140px,1.4fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(100px,0.9fr)_minmax(120px,1fr)]";

/**
 * Ponuka › Poukazy (Z78): gift vouchers — a value the guest pays with in the cart, not a discount. State, balance,
 * until when; search, filters, sorting and paging in the database (rule 7); a row opens the voucher (PDF, e-mail,
 * where it was used).
 */
export default async function GiftVouchersPage({ searchParams }: PageProps<"/admin/vouchers">) {
  const active = await requireTenant();
  const sp = await searchParams;
  const paging = await readPaging(sp, "poukazy");
  const p = { ...giftVoucherListParams(sp), page: paging.page, pageSize: paging.size };
  const tenant = await getTenantInfo(active.tenantId);
  const today = todayIso(tenant.timezone);
  const [t, locale, list, counts] = await Promise.all([
    getTranslations("giftVouchers"),
    getLocale(),
    queryGiftVouchers(active.tenantId, p, today),
    giftVoucherCounts(active.tenantId, today),
  ]);
  const fmt = (cents: number, currency: string) => formatMoney(money(cents, currency), locale);

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("offer", t("title"), active.tenantId)}
        title={t("title")}
        help="giftVouchers"
        actions={<GiftVouchersActions />}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-3xl text-sm">{t("lead")}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterPills
            param="filter"
            label={t("filterLabel")}
            options={[
              { value: "", label: t("filters.all"), count: counts.all },
              { value: "valid", label: t("filters.valid"), count: counts.valid },
              { value: "used", label: t("filters.used"), count: counts.used },
              { value: "expired", label: t("filters.expired"), count: counts.expired },
              { value: "cancelled", label: t("filters.cancelled"), count: counts.cancelled },
            ]}
          />
          <ListSearch placeholder={t("search")} className="md:ml-auto md:w-80" />
        </div>

        {list.rows.length ? (
          <div className="surface overflow-x-auto">
            <div role="table" aria-label={t("title")} className="min-w-[760px]">
              <div
                role="row"
                className={cn("border-hair label-mono grid gap-4 border-b px-5 py-3", COLS)}
              >
                <span role="columnheader">{t("cols.code")}</span>
                <span role="columnheader">{t("cols.recipient")}</span>
                <span role="columnheader" className="text-right">
                  <SortHeader column="amount_cents">{t("cols.amount")}</SortHeader>
                </span>
                <span role="columnheader" className="text-right">
                  {t("cols.balance")}
                </span>
                <span role="columnheader">
                  <SortHeader column="valid_until">{t("cols.validUntil")}</SortHeader>
                </span>
                <span role="columnheader">{t("cols.state")}</span>
              </div>
              {list.rows.map((v) => {
                const state = giftVoucherState(v, today);
                return (
                  <PanelLink
                    key={v.id}
                    type="voucher"
                    id={v.id}
                    role="row"
                    className={cn(
                      "border-hair grid items-center gap-4 border-b px-5 py-3 transition-colors last:border-b-0 hover:bg-[#faf9f6]",
                      COLS,
                    )}
                  >
                    <span
                      role="cell"
                      className="text-ink truncate font-mono text-[13px] font-medium"
                    >
                      {v.code}
                    </span>
                    <span role="cell" className="grid min-w-0 gap-0.5">
                      <span className="text-ink truncate text-sm">{v.recipient_name ?? "—"}</span>
                      {v.note ? (
                        <span className="truncate text-[12.5px] text-[#5a6672]">{v.note}</span>
                      ) : null}
                    </span>
                    <span role="cell" className="text-ink text-right text-sm tabular-nums">
                      {fmt(v.amount_cents, v.currency)}
                    </span>
                    <span
                      role="cell"
                      className="text-ink text-right text-sm font-medium tabular-nums"
                    >
                      {fmt(v.balance_cents, v.currency)}
                    </span>
                    <span role="cell" className="text-sm">
                      {v.valid_until ? formatDate(v.valid_until, locale, "short") : t("noExpiry")}
                    </span>
                    <span role="cell">
                      <GiftVoucherPill state={state} label={t(`states.${state}`)} />
                    </span>
                  </PanelLink>
                );
              })}
            </div>
            <div className="border-hair border-t px-5 py-2">
              <Pagination page={p.page} pageSize={p.pageSize} total={list.total} list="poukazy" />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-sm">
            {counts.all ? t("emptyFilter") : t("empty")}
          </p>
        )}
      </div>
      <UrlPanel
        type="voucher"
        load={loadGiftVoucherPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
