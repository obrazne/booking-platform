"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBooking } from "./guest-booking";

const CATEGORIES = ["exterior", "interior", "bedrooms", "wellness", "surroundings"] as const;

/**
 * Gallery window (v2): albums by photo category, grid of all photos, big photo with a strip of thumbnails,
 * testimonials on the right (phones: switch Photos / Testimonials). One window at a time; Esc / Back close one level.
 */
export function GalleryModal() {
  const { gallery } = useBooking();
  // Fresh state (album, tab) every time the window opens.
  return <GalleryWindow key={gallery.open ? `open:${gallery.highlight}` : "closed"} />;
}

function GalleryWindow() {
  const t = useTranslations("guest");
  const b = useBooking();
  const { data, gallery } = b;
  const photos = data.photos;
  const [album, setAlbum] = useState<string>("all");
  const [tab, setTab] = useState<"photos" | "reviews">("photos");
  const highlightRef = useRef<HTMLButtonElement>(null);

  const albums = useMemo(() => {
    const out = [{ key: "all", count: photos.length, cover: photos[0]?.url ?? null }];
    for (const c of CATEGORIES) {
      const list = photos.filter((p) => p.category === c);
      if (list.length > 0) out.push({ key: c, count: list.length, cover: list[0]!.url });
    }
    return out;
  }, [photos]);
  const shown = photos
    .map((p, index) => ({ ...p, index }))
    .filter((p) => album === "all" || p.category === album);

  useEffect(() => {
    if (gallery.open && gallery.highlight !== null) {
      requestAnimationFrame(() => highlightRef.current?.scrollIntoView({ block: "center" }));
    }
  }, [gallery.open, gallery.highlight]);

  const single = gallery.photo;
  const current = single !== null ? photos[single] : null;
  const go = (delta: number) => {
    if (single === null) return;
    b.showPhoto((single + delta + photos.length) % photos.length);
  };
  // Strip of up to 6 thumbnails around the current photo.
  const stripStart =
    single === null ? 0 : Math.max(0, Math.min(single - 2, Math.max(0, photos.length - 6)));
  const strip = photos
    .slice(stripStart, stripStart + 6)
    .map((p, k) => ({ ...p, index: stripStart + k }));

  const sourceNote = useMemo(() => {
    const names = [...new Set(data.testimonials.map((r) => r.source))]
      .map((s) => t(`v2.sources.${s as "google"}`))
      .join(", ");
    return names ? t("v2.reviewsOrigin", { sources: names }) : "";
  }, [data.testimonials, t]);

  return (
    <Dialog open={gallery.open} onOpenChange={(o) => !o && b.closeGallery()}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          if (single !== null) {
            e.preventDefault();
            b.showPhoto(null);
          }
        }}
        className="inset-0 flex h-svh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:inset-x-10 sm:inset-y-8 sm:h-auto sm:w-auto sm:max-w-none sm:rounded-lg"
      >
        <div className="border-line flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="grid gap-0.5">
            <DialogTitle className="text-ink text-[17px] font-extrabold tracking-tight">
              {data.propertyName}
            </DialogTitle>
            <span className="text-muted-foreground text-[13px]">
              {t("v2.galleryCount", { photos: photos.length, reviews: data.testimonials.length })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => b.openCart(1)}
              className="bg-primary text-primary-foreground hidden min-h-[42px] items-center rounded-full px-5 text-sm font-bold sm:inline-flex"
            >
              {t("property.viewStay")}
            </button>
            <button
              type="button"
              onClick={b.closeGallery}
              className="border-line text-ink inline-flex min-h-[42px] items-center gap-2 rounded-full border px-3.5 text-sm font-medium"
            >
              <span className="hidden sm:inline">{t("v2.close")}</span> <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Phones: Photos | Testimonials */}
        {data.testimonials.length > 0 ? (
          <div className="border-line flex shrink-0 gap-1 border-b p-2 lg:hidden" role="tablist">
            {(["photos", "reviews"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "min-h-10 flex-1 rounded-full text-sm font-medium",
                  tab === k ? "bg-ink text-white" : "text-ink",
                )}
              >
                {k === "photos"
                  ? t("v2.tabPhotos", { count: photos.length })
                  : t("v2.tabReviews", { count: data.testimonials.length })}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <div className={cn("relative min-w-0 flex-1", tab === "reviews" && "hidden lg:block")}>
            <div className="absolute inset-0 grid content-start gap-[18px] overflow-y-auto px-4 pt-[18px] pb-10 sm:px-6">
              <div className="flex gap-3.5 overflow-x-auto pb-1 sm:flex-wrap">
                {albums.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={album === a.key}
                    onClick={() => setAlbum(a.key)}
                    className="grid shrink-0 gap-1.5 text-left"
                  >
                    <span
                      className={cn(
                        "relative hidden h-[72px] w-[108px] overflow-hidden rounded-md bg-[#f1eee6] ring-offset-2 sm:block",
                        album === a.key && "ring-primary ring-2",
                      )}
                    >
                      {a.cover ? (
                        <Image src={a.cover} alt="" fill sizes="108px" className="object-cover" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[13px] sm:rounded-none sm:p-0",
                        album === a.key
                          ? "bg-ink sm:text-ink font-bold text-white sm:bg-transparent"
                          : "text-muted-foreground border-line border sm:border-0",
                      )}
                    >
                      {t(`v2.albums.${a.key as "all"}`)} · {a.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {shown.map((p) => (
                  <button
                    key={p.url}
                    ref={p.index === gallery.highlight ? highlightRef : undefined}
                    type="button"
                    onClick={() => b.showPhoto(p.index)}
                    aria-label={p.alt || t("v2.photoN", { n: p.index + 1 })}
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-md ring-offset-2",
                      p.index === gallery.highlight && "ring-primary ring-[3px]",
                    )}
                  >
                    <Image
                      src={p.url}
                      alt={p.alt}
                      fill
                      sizes="(min-width: 640px) 280px, 50vw"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {current ? (
              <div className="bg-accent-night absolute inset-0 flex flex-col gap-3.5 px-4 pt-[18px] pb-[22px] sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => b.showPhoto(null)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 py-0 pr-3.5 pl-2.5 text-sm font-medium text-white"
                  >
                    <ArrowLeft className="size-4" /> {t("v2.allPhotos")}
                  </button>
                  <span className="font-mono text-xs text-white/70">
                    {single! + 1} / {photos.length}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t("v2.prevPhoto")}
                    className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-white/20 text-white sm:inline-flex"
                  >
                    <ChevronLeft />
                  </button>
                  <div
                    className="relative h-full min-w-0 flex-1"
                    onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0]!.clientX - touchX.current;
                      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                    }}
                  >
                    <Image
                      key={current.url}
                      src={current.url}
                      alt={current.alt}
                      fill
                      sizes={BIG_SIZES}
                      quality={80}
                      className="object-contain"
                      priority
                    />
                    {/* Neighbours load in advance, so the arrows switch at once. */}
                    {[1, -1, 2].map((delta) => {
                      const p = photos[(single! + delta + photos.length) % photos.length];
                      return p && p.url !== current.url ? (
                        <Image
                          key={`pre:${p.url}`}
                          src={p.url}
                          alt=""
                          aria-hidden
                          fill
                          sizes={BIG_SIZES}
                          quality={80}
                          loading="eager"
                          className="invisible object-contain"
                        />
                      ) : null;
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t("v2.nextPhoto")}
                    className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-white/20 text-white sm:inline-flex"
                  >
                    <ChevronRight />
                  </button>
                </div>
                {current.alt ? (
                  <span className="text-center text-sm text-white/85">{current.alt}</span>
                ) : null}
                <div className="flex shrink-0 justify-center gap-2.5 overflow-x-auto px-1.5 py-1.5 sm:px-16">
                  {strip.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => b.showPhoto(p.index)}
                      aria-label={t("v2.photoN", { n: p.index + 1 })}
                      aria-current={p.index === single}
                      className={cn(
                        "relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-md sm:h-[104px] sm:w-[170px]",
                        p.index === single
                          ? "ring-2 ring-white ring-offset-2 ring-offset-transparent"
                          : "opacity-50 hover:opacity-80",
                      )}
                    >
                      <Image src={p.url} alt="" fill sizes="170px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {data.testimonials.length > 0 ? (
            <aside
              className={cn(
                "border-line grid w-full shrink-0 content-start gap-1.5 overflow-y-auto bg-[#fbfaf9] px-6 pt-[22px] pb-8 lg:w-[360px] lg:border-l",
                tab === "photos" && "hidden lg:grid",
              )}
            >
              <span className="kicker kicker-sans text-accent-2 text-xs">{t("v2.guestsSay")}</span>
              <span className="text-ink text-xl font-extrabold tracking-tight">
                {t("sections.testimonials.title")}{" "}
                <span className="text-ink-soft">{t("sections.testimonials.subtitle")}</span>
              </span>
              {sourceNote ? (
                <span className="text-muted-foreground pb-2 text-xs leading-relaxed">
                  {sourceNote}
                </span>
              ) : null}
              {data.testimonials.map((r) => (
                <figure key={r.id} className="border-line grid gap-2.5 border-t py-4">
                  <blockquote className="text-ink text-[15px] leading-relaxed">
                    „{r.text}“
                  </blockquote>
                  <figcaption className="grid gap-0.5">
                    <span className="text-accent-2 font-mono text-[11px] font-medium tracking-wider uppercase">
                      {r.author}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t(`v2.sources.${r.source as "google"}`)}
                      {r.stayMonth
                        ? ` · ${new Intl.DateTimeFormat(data.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${r.stayMonth}T00:00:00Z`))}`
                        : ""}
                    </span>
                  </figcaption>
                </figure>
              ))}
              {data.reviewsUrl ? (
                <a
                  href={data.reviewsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  {t("v2.moreReviews")} <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </aside>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const touchX = { current: 0 };
/** One size for the big photo and its preloaded neighbours (the browser reuses the same file). */
const BIG_SIZES = "(min-width: 1280px) 1200px, 100vw";
