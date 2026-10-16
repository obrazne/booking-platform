"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { markTourSeen } from "./actions";
import { TOURS, tourImage, type TourKey } from "./tours";

/** Event that opens the tour from anywhere (menu item "What's new"). */
export const OPEN_TOUR_EVENT = "tour:open";
export const openTour = () => window.dispatchEvent(new Event(OPEN_TOUR_EVENT));

/**
 * "What's new" window (A15): screenshot, heading, two sentences, progress dots, Back / Next / "Show me".
 * Opens by itself once per tour version, again from the menu. Esc or the cross closes it; full screen with swiping on phones.
 */
export function TourDialog({ tourKey, autoOpen }: { tourKey: TourKey; autoOpen: boolean }) {
  const t = useTranslations("tours");
  const router = useRouter();
  const tour = TOURS[tourKey];
  const [open, setOpen] = useState(autoOpen);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const slide = tour.slides[index]!;
  const last = index === tour.slides.length - 1;

  useEffect(() => {
    const show = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TOUR_EVENT, show);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, show);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    void markTourSeen(tourKey);
  }, [tourKey]);

  const go = (to: number) => setIndex(Math.max(0, Math.min(tour.slides.length - 1, to)));
  const key = (k: string) => `${tourKey}.${slide.id}.${k}` as Parameters<typeof t>[0];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          aria-describedby="tour-body"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
          }}
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX;
            touchX.current = null;
            if (start == null || end == null || Math.abs(end - start) < 50) return;
            go(end < start ? index + 1 : index - 1);
          }}
          className={cn(
            "bg-background text-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 fixed z-50 flex flex-col overflow-hidden outline-none",
            // Phone: full screen. Larger screens: centred window, radius 10.
            "inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(760px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[10px] sm:shadow-2xl",
          )}
        >
          <div className="bg-muted relative aspect-[16/10] w-full shrink-0 border-b">
            <Image
              key={slide.id}
              src={tourImage(tourKey, slide.id)}
              alt=""
              fill
              sizes="(min-width: 640px) 760px, 100vw"
              className="object-cover object-top"
              priority={index === 0}
            />
          </div>
          {/* Next screenshot ready before the click. */}
          {tour.slides[index + 1] ? (
            <link rel="prefetch" as="image" href={tourImage(tourKey, tour.slides[index + 1]!.id)} />
          ) : null}

          <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("kicker")} · {t("progress", { n: index + 1, total: tour.slides.length })}
            </p>
            <DialogPrimitive.Title className="text-xl font-semibold tracking-tight">
              {t(key("title"))}
            </DialogPrimitive.Title>
            <p id="tour-body" className="text-muted-foreground text-[15px] leading-relaxed">
              {t(key("body"))}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              <div
                className="flex w-full gap-1.5 sm:mr-auto sm:w-auto"
                role="group"
                aria-label={t("slides")}
              >
                {tour.slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={t("goTo", { n: i + 1 })}
                    aria-current={i === index ? "step" : undefined}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === index ? "bg-primary w-5" : "bg-muted-foreground/30 w-2",
                    )}
                  />
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    close();
                    router.push(slide.href);
                  }}
                >
                  <ExternalLink /> {t("showMe")}
                </Button>
                {index > 0 ? (
                  <Button variant="outline" onClick={() => go(index - 1)}>
                    <ArrowLeft /> {t("back")}
                  </Button>
                ) : null}
                {last ? (
                  <Button onClick={close}>{t("done")}</Button>
                ) : (
                  <Button onClick={() => go(index + 1)}>
                    {t("next")} <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogPrimitive.Close asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute top-3 right-3 rounded-full shadow"
              aria-label={t("close")}
            >
              <X />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
