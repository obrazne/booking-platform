import { Pagination } from "@/core/admin/data-list";
import { readPaging } from "@/core/admin/paging";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquareReply, Pin } from "lucide-react";
import { requireTenant } from "@/core/admin/action";
import { FilterPills } from "@/core/admin/data-list";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { formatDate } from "@/core/format/format";
import { isModuleEnabled } from "@/core/modules/registry";
import { REVIEW_STATUSES, stars, type ReviewStatus } from "@/modules/reviews/model";
import { loadReviewPanel } from "./panel-loader";
import { queryReviews, reviewStatusParam } from "./query";
import { ReviewPill } from "./review-pill";

/** Changes with every server render — tells the open panel to load its detail again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

/**
 * Ponuka › Recenzie (Z34, vzor v1.1 — list and panel): verified reviews from stays with state, stars, property and
 * date; the panel publishes, rejects, replies and features. Only with the module `reviews` on.
 */
export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const active = await requireTenant();
  if (!(await isModuleEnabled(active.tenantId, "reviews"))) notFound();
  const [t, locale, sp] = await Promise.all([
    getTranslations("reviews"),
    getLocale(),
    searchParams,
  ]);
  const status = reviewStatusParam(sp.status);
  const paging = await readPaging(sp, "recenzie");
  const { rows, found, counts, total, summary } = await queryReviews(
    active.tenantId,
    status,
    paging,
  );

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("offer", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-prose text-sm">{t("lead")}</p>
        <p className="text-ink text-sm font-semibold" role="status">
          {summary && summary.count > 0
            ? t("summary", {
                average: new Intl.NumberFormat(locale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(Number(summary.average)),
                count: summary.count,
              })
            : t("noSummary")}
        </p>
        <FilterPills
          param="status"
          label={t("title")}
          options={[
            { value: "", label: t("all"), count: total },
            ...REVIEW_STATUSES.map((s) => ({
              value: s,
              label: t(`statuses.${s}`),
              count: counts[s] ?? 0,
            })),
          ]}
        />
        {rows.length ? (
          <ul aria-label={t("title")} className="border-line border-t">
            {rows.map((r) => (
              <li key={r.id}>
                <PanelLink
                  type="review"
                  id={r.id}
                  className="border-line grid gap-x-4 gap-y-1 border-b px-2 py-4 transition-colors hover:bg-[#fbfaf7] sm:grid-cols-[120px_minmax(0,1.6fr)_minmax(0,1fr)_110px_170px] sm:items-center"
                >
                  <span className="text-[15px] text-[#8a5a12]">
                    <span aria-hidden>{stars(r.rating)}</span>
                    <span className="sr-only">{t("stars", { rating: r.rating })}</span>
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-ink inline-flex items-center gap-1.5 truncate text-[15px] font-bold">
                      {r.display_name}
                      {r.featured ? (
                        <Pin className="text-primary size-3.5" aria-label={t("featured")} />
                      ) : null}
                      {r.owner_reply ? (
                        <MessageSquareReply
                          className="size-3.5 text-[#5a6672]"
                          aria-label={t("replied")}
                        />
                      ) : null}
                    </span>
                    <span className="truncate text-[13px] text-[#5a6672]">
                      {r.body || t("panel.noText")}
                    </span>
                  </span>
                  <span className="text-sm">{r.property?.name}</span>
                  <span className="text-[13px] text-[#5a6672]">
                    {formatDate(r.submitted_at.slice(0, 10), locale, "short")}
                  </span>
                  <span>
                    <ReviewPill
                      status={r.status}
                      label={t(`statuses.${r.status as ReviewStatus}`)}
                    />
                  </span>
                </PanelLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-10 text-center text-sm">{t("empty")}</p>
        )}
        {found > 0 ? (
          <Pagination page={paging.page} pageSize={paging.size} total={found} list="recenzie" />
        ) : null}
      </div>
      <UrlPanel
        type="review"
        load={loadReviewPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
