import "server-only";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { requireTenant } from "@/core/admin/action";
import { PanelSection, PanelSummary, type PanelContent } from "@/core/admin/record-panel";
import { formatDateTime } from "@/core/format/format";
import { getTenantInfo } from "@/core/tenant/info";
import { PARTIAL_RATINGS, publishesAt, stars, type ReviewStatus } from "@/modules/reviews/model";
import { ReviewActions, ReviewReply } from "./panel-actions";
import { getReview } from "./query";
import { ReviewPill } from "./review-pill";

/** Panel of one review (vzor v1.1): who and how, the text, partial ratings, reply and the owner's actions. */
export async function reviewPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, tc, locale, tenant, review] = await Promise.all([
    getTranslations("reviews"),
    getTranslations("common"),
    getLocale(),
    getTenantInfo(active.tenantId),
    getReview(active.tenantId, id),
  ]);
  if (!review) return { body: <p className="text-muted-foreground text-sm">{tc("noResults")}</p> };
  const status = review.status as ReviewStatus;
  const when = (iso: string) => formatDateTime(iso, locale, tenant.timezone, "short");
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${review.stay_month}T00:00:00Z`));
  const partials = PARTIAL_RATINGS.flatMap((k) => {
    const v = review[`rating_${k}`];
    return typeof v === "number" ? [{ key: k, value: v }] : [];
  });
  const stateLine =
    status === "submitted"
      ? t("panel.publishesAt", { date: when(publishesAt(review.submitted_at).toISOString()) })
      : status === "published" && review.published_at
        ? t("panel.publishedAt", { date: when(review.published_at) })
        : review.reject_reason
          ? t("panel.rejectedWith", { reason: t(`reasons.${review.reject_reason}` as never) })
          : null;

  return {
    label: `${review.display_name} — ${t("stars", { rating: review.rating })}`,
    body: (
      <div className="grid gap-5">
        <PanelSummary
          title={review.display_name}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <BadgeCheck className="text-primary size-4" aria-hidden /> {t("panel.verified")}
              {review.property ? ` · ${review.property.name}` : ""}
            </span>
          }
          facts={[
            {
              label: t("panel.rating"),
              value: (
                <span>
                  <span aria-hidden className="text-[#8a5a12]">
                    {stars(review.rating)}
                  </span>
                  <span className="sr-only">{t("stars", { rating: review.rating })}</span>
                </span>
              ),
            },
            { label: t("panel.stay"), value: month },
            { label: t("panel.submitted"), value: when(review.submitted_at) },
            {
              label: t("panel.reservation"),
              value: review.reservation ? (
                <Link
                  href={`/admin/reservations?panel=reservation:${review.reservation.id}`}
                  className="underline underline-offset-4"
                >
                  {review.reservation.number}
                </Link>
              ) : (
                "—"
              ),
            },
          ]}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ReviewPill status={status} label={t(`statuses.${status}`)} />
            {review.featured ? (
              <span className="text-primary text-[13px] font-semibold">{t("featured")}</span>
            ) : null}
            {stateLine ? (
              <span className="text-muted-foreground text-[13px]">{stateLine}</span>
            ) : null}
          </div>
        </PanelSummary>

        <PanelSection label={t("panel.text")}>
          {review.body ? (
            <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">
              {review.body}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">{t("panel.noText")}</p>
          )}
        </PanelSection>

        {partials.length ? (
          <PanelSection label={t("panel.partial")}>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
              {partials.map((p) => (
                <div key={p.key} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t(`parts.${p.key}`)}</dt>
                  <dd className="text-ink font-semibold tabular-nums">{p.value} / 5</dd>
                </div>
              ))}
            </dl>
          </PanelSection>
        ) : null}

        <PanelSection label={t("panel.reply")}>
          <ReviewReply id={review.id} reply={review.owner_reply ?? ""} />
        </PanelSection>
      </div>
    ),
    actions: <ReviewActions id={review.id} status={status} featured={review.featured} />,
  };
}
