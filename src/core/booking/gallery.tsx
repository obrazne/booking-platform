"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** One large and four small photos with "All N photos" opening the full gallery. */
export function Gallery({
  photos,
  title,
}: {
  photos: { url: string; alt: string }[];
  title: string;
}) {
  const t = useTranslations("guest.property");
  const [open, setOpen] = useState(false);
  if (photos.length === 0) return null;
  return (
    <div className="relative">
      <div className="grid gap-2 overflow-hidden sm:grid-cols-4 sm:grid-rows-2 sm:rounded-3xl">
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={p.alt || title}
            className={cn(
              "relative overflow-hidden",
              i === 0
                ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                : "hidden aspect-[4/3] sm:block",
            )}
          >
            <Image
              src={p.url}
              alt={p.alt}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
              className="object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      {photos.length > 1 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute right-4 bottom-4 rounded-full shadow"
          onClick={() => setOpen(true)}
        >
          <Images /> {t("allPhotos", { count: photos.length })}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
          <DialogTitle>{title}</DialogTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((p) => (
              <Image
                key={p.url}
                src={p.url}
                alt={p.alt}
                width={1200}
                height={800}
                sizes="(min-width: 640px) 32rem, 100vw"
                className="h-auto w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
