"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTIAL_RATINGS } from "../model";
import { submitGuestReview } from "./actions";

type Part = (typeof PARTIAL_RATINGS)[number];

/** Thanks after a review (design `UcetPobyt`): Google for everybody, whatever the stars, and "Rezervovať znova". */
export function ReviewThanks({
  firstName,
  googleUrl,
  rebookHref,
  pending,
}: {
  firstName: string;
  googleUrl: string | null;
  rebookHref: string | null;
  pending: boolean;
}) {
  const t = useTranslations("modules.reviews.guest");
  return (
    <section
      id="hodnotenie"
      className="grid scroll-mt-24 gap-4 rounded-[10px] border border-[#dfe8e2] bg-[#f6f9f7] px-7 py-[26px]"
    >
      <h2 className="text-ink text-[26px] leading-tight font-extrabold tracking-tight">
        {firstName ? t("thanksName", { name: firstName }) : t("thanks")}{" "}
        <span className="text-[#8b929b]">{t("thanks2")}</span>
      </h2>
      <p className="text-[15px] leading-relaxed">
        {pending ? t("thanksPending") : t("thanksPublished")}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {googleUrl ? (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line text-ink inline-flex min-h-11 items-center rounded-full border bg-white px-[18px] text-sm font-medium"
          >
            {t("google")} <span aria-hidden>&nbsp;↗</span>
          </a>
        ) : null}
        {rebookHref ? (
          <a
            href={rebookHref}
            className="bg-ink inline-flex min-h-11 items-center rounded-full px-[18px] text-sm font-bold text-white"
          >
            {t("rebook")}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/**
 * "Ako sa vám u nás páčilo? Úprimne." (Z38, design `UcetPobyt` after departure): overall stars, optional partial
 * ratings, text and the name to show. The database decides whether the guest may still review.
 */
export function ReviewForm({
  reservationId,
  until,
  defaultName,
  firstName,
  propertyName,
  googleUrl,
  rebookHref,
}: {
  reservationId: string;
  until: string;
  defaultName: string;
  firstName: string;
  propertyName: string;
  googleUrl: string | null;
  rebookHref: string | null;
}) {
  const t = useTranslations("modules.reviews.guest");
  const tp = useTranslations("reviews.parts");
  const [rating, setRating] = useState(0);
  const [parts, setParts] = useState<Partial<Record<Part, number>>>({});
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const labels = [t("stars.1"), t("stars.2"), t("stars.3"), t("stars.4"), t("stars.5")];

  if (sent) {
    return (
      <ReviewThanks firstName={firstName} googleUrl={googleUrl} rebookHref={rebookHref} pending />
    );
  }

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await submitGuestReview({ reservationId, rating, parts, body, displayName: name });
      if (r.ok) setSent(true);
      else
        setError(
          t(`errors.${r.error === "expired" || r.error === "exists" ? r.error : "generic"}`),
        );
    });

  return (
    <section
      id="hodnotenie"
      aria-labelledby="review-title"
      className="grid scroll-mt-24 gap-[22px]"
    >
      <div className="grid gap-1.5">
        <span className="text-accent-2 text-xs font-medium tracking-[0.16em] uppercase">
          {t("kicker")}
        </span>
        <h2
          id="review-title"
          className="text-ink text-[30px] leading-tight font-extrabold tracking-tight"
        >
          {t("title")} <span className="text-[#8b929b]">{t("title2")}</span>
        </h2>
        <p className="text-sm leading-relaxed text-[#5a6672]">
          {t("lead", {
            date: new Intl.DateTimeFormat("sk", { timeZone: "UTC" }).format(
              new Date(`${until}T00:00:00Z`),
            ),
          })}
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("overall")}</legend>
        <div className="flex flex-wrap items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rating === n}
              aria-label={t("starAria", { n, label: labels[n - 1]! })}
              onClick={() => setRating(n)}
              className="focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2"
            >
              <Star
                aria-hidden
                className={cn(
                  "size-[30px]",
                  n <= rating ? "fill-[#d39a2c] text-[#d39a2c]" : "text-[#c9ccd1]",
                )}
                strokeWidth={1.4}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-[#5a6672]" aria-live="polite">
            {rating ? labels[rating - 1] : ""}
          </span>
        </div>
      </fieldset>

      <fieldset className="grid gap-x-7 gap-y-2.5 rounded-[10px] border border-[#ecebe6] bg-[#fafaf8] px-[18px] py-4 sm:grid-cols-2">
        <legend className="sr-only">{t("details")}</legend>
        <span aria-hidden className="text-[13px] text-[#5a6672] sm:col-span-2">
          {t("details")} <span className="text-[#6e747c]">· {t("optional")}</span>
        </span>
        {PARTIAL_RATINGS.map((p) => (
          <div
            key={p}
            role="group"
            aria-label={tp(p)}
            className="flex items-center justify-between gap-2.5"
          >
            <span className="text-ink text-sm">{tp(p)}</span>
            <span className="inline-flex gap-[3px]">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= (parts[p] ?? 0);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={parts[p] === n}
                    aria-label={t("partAria", { part: tp(p), n })}
                    onClick={() => setParts({ ...parts, [p]: n })}
                    className={cn(
                      "focus-visible:ring-ring size-[22px] rounded-full border outline-none focus-visible:ring-2",
                      on ? "bg-primary border-primary" : "border-[#9aa0a7] bg-white",
                    )}
                  />
                );
              })}
            </span>
          </div>
        ))}
      </fieldset>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t("text")}</span>
        <textarea
          rows={4}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("textPlaceholder")}
          className="border-line text-ink rounded-[10px] border px-3.5 py-3 text-[15px]"
        />
      </label>
      <label className="grid max-w-80 gap-1.5">
        <span className="text-sm font-medium">{t("showAs")}</span>
        <input
          type="text"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-line text-ink h-[46px] rounded-[10px] border px-3.5 text-[15px]"
        />
      </label>
      <p className="max-w-[640px] text-[13px] leading-relaxed text-[#5a6672]">
        {t("rules", { property: propertyName })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !rating || !name.trim()}
          className="bg-ink inline-flex min-h-[50px] items-center rounded-full px-[26px] text-[15px] font-bold text-white disabled:opacity-50"
        >
          {t("submit")}
        </button>
        {!rating ? <span className="text-[13px] text-[#5a6672]">{t("needStars")}</span> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[#a8432f]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
