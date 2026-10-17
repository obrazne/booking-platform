"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ShieldCheck } from "lucide-react";
import type { GuestTestimonial } from "@/core/sections/types";
import { cn } from "@/lib/utils";
import { stars } from "../model";
import type { VerifiedReviews } from "./public";

type Filter = "all" | "reply" | "critical";
const SHOWN = 4;

/**
 * "Hostia hovoria" with verified reviews (Z38, design `Recenzie`): on the left the average, partial ratings as bars
 * and how reviews are verified; on the right filters and the reviews with the owner's replies; below, apart,
 * testimonials from other sources (manual, not verified, not in the average).
 */
export function VerifiedReviewsSection({
  verified,
  others,
  heading,
  ownerName,
  locale,
}: {
  verified: VerifiedReviews;
  others: GuestTestimonial[];
  heading: { kicker: string; title: string; subtitle: string };
  ownerName: string | null;
  locale: string;
}) {
  const t = useTranslations("modules.reviews.public");
  const tp = useTranslations("reviews.parts");
  const tv = useTranslations("guest.v2");
  const [filter, setFilter] = useState<Filter>("all");
  const [all, setAll] = useState(false);
  const num = (v: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const month = (iso: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const list = verified.reviews.filter((r) =>
    filter === "all" ? true : filter === "reply" ? Boolean(r.reply) : r.rating <= 3,
  );
  const shown = all ? list : list.slice(0, SHOWN);
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll", { count: verified.count }) },
    { key: "reply", label: t("filterReply") },
    { key: "critical", label: t("filterCritical") },
  ];

  return (
    <div className="grid gap-9">
      <div className="grid items-start gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-[18px] lg:sticky lg:top-6">
          <span className="text-accent-2 text-[13px] font-medium tracking-[0.16em] uppercase">
            {heading.kicker}
          </span>
          <h2 className="font-heading text-ink text-[36px] leading-[1.1] font-extrabold tracking-tight">
            {heading.title} <span className="text-[#8b929b]">{heading.subtitle}</span>
          </h2>
          <div className="flex items-center gap-3.5">
            <span className="text-ink text-[56px] leading-none font-extrabold tracking-tighter">
              {num(verified.average)}
            </span>
            <span className="grid gap-1">
              <span aria-hidden className="text-lg tracking-[2px] text-[#b07c16]">
                {stars(verified.average)}
              </span>
              <span className="text-sm text-[#5a6672]">
                {t("ofVerified", { count: verified.count })}
              </span>
            </span>
          </div>
          {verified.parts.length ? (
            <dl className="grid gap-[9px]">
              {verified.parts.map((p) => (
                <div
                  key={p.key}
                  className="grid grid-cols-[150px_1fr_30px] items-center gap-2.5 text-sm"
                >
                  <dt>{tp(p.key)}</dt>
                  <dd className="h-1.5 overflow-hidden rounded-full bg-[#ecebe6]">
                    <span
                      className="bg-primary block h-full rounded-full"
                      style={{ width: `${(p.value / 5) * 100}%` }}
                    />
                  </dd>
                  <dd className="text-right font-mono text-xs text-[#5a6672]">{num(p.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex gap-2.5 rounded-[10px] border border-[#dfe8e2] bg-[#f6f9f7] px-4 py-3.5">
            <ShieldCheck aria-hidden className="text-primary mt-px size-[18px] shrink-0" />
            <p className="text-[13px] leading-relaxed">
              <strong className="font-bold">{t("verifiedTitle")}</strong> {t("verifiedText")}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-3.5">
          <div role="group" aria-label={t("filters")} className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => {
                  setFilter(f.key);
                  setAll(false);
                }}
                className={cn(
                  "min-h-9 rounded-full border px-3.5 text-[13px] font-medium",
                  filter === f.key
                    ? "border-ink bg-ink text-white"
                    : "text-ink border-[#dcd9d1] bg-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {shown.length ? (
            shown.map((r) => (
              <article
                key={r.id}
                className={cn(
                  "grid gap-3 rounded-[10px] border px-[22px] py-5",
                  r.featured ? "border-[#dfe8e2] bg-[#fbfdfc]" : "border-line bg-white",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eee6] text-[13px] font-bold text-[#5a6672]"
                    >
                      {r.name
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <span className="grid gap-px">
                      <span className="text-ink text-[15px] font-bold">{r.name}</span>
                      <span className="text-xs text-[#5a6672]">{month(r.stayMonth)}</span>
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    {r.featured ? (
                      <span className="text-accent-2 font-mono text-[10px] font-medium tracking-widest uppercase">
                        {t("featured")}
                      </span>
                    ) : null}
                    <span aria-hidden className="text-[15px] tracking-[1px] text-[#b07c16]">
                      {stars(r.rating)}
                    </span>
                    <span className="sr-only">{t("starsAria", { rating: r.rating })}</span>
                  </span>
                </div>
                {r.body ? (
                  <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">
                    {r.body}
                  </p>
                ) : null}
                {r.reply ? (
                  <div className="border-primary ml-4 grid gap-1 rounded-r-lg border-l-[3px] bg-[#fafaf8] px-4 py-3">
                    <span className="text-primary font-mono text-[11px] font-medium tracking-[0.08em] uppercase">
                      {ownerName ? t("replyFrom", { name: ownerName }) : t("reply")}
                    </span>
                    <span className="text-sm leading-relaxed whitespace-pre-line">{r.reply}</span>
                  </div>
                ) : null}
                <span className="inline-flex items-center gap-1.5 text-xs text-[#5a6672]">
                  <Check aria-hidden className="text-primary size-3.5" strokeWidth={2} />
                  {t("verifiedStay")}
                </span>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5a6672]">{t("noneInFilter")}</p>
          )}
          {!all && list.length > SHOWN ? (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="text-ink min-h-11 justify-self-start rounded-full border border-[#dcd9d1] bg-white px-[18px] text-sm font-medium"
            >
              {t("showAll", { count: list.length })}
            </button>
          ) : null}
        </div>
      </div>

      {others.length ? (
        <div className="border-line grid gap-6 border-t pt-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14">
          <div className="grid content-start gap-1.5">
            <h3 className="text-ink text-base font-bold">{t("othersTitle")}</h3>
            <p className="text-[13px] leading-relaxed text-[#5a6672]">{t("othersText")}</p>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {others.map((o) => (
              <figure
                key={o.id}
                className="border-line m-0 grid gap-2 rounded-[10px] border px-[18px] py-4"
              >
                <blockquote className="text-ink text-sm leading-relaxed">„{o.text}“</blockquote>
                <figcaption className="font-mono text-[11px] tracking-[0.08em] text-[#5a6672] uppercase">
                  {o.author} ·{" "}
                  {o.sourceUrl ? (
                    <a
                      href={o.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {tv(`sources.${o.source as "google"}`)} ↗
                    </a>
                  ) : (
                    tv(`sources.${o.source as "google"}`)
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
