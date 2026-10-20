import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/core/format/format";
import type { Stay } from "@/core/guest/zone";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { cn } from "@/lib/utils";

/** "Book again": same property, unit, guests and services — the guest only picks the dates (B10). */
export function rebookHref(stay: Stay): string | null {
  if (!stay.property?.published) return null;
  const services = stay.lines
    .filter((l) => l.kind === "service" && l.ref_id)
    .map((l) => {
      const items = Number((l.meta as { items?: number } | null)?.items ?? 1);
      return `${l.ref_id}:${Math.max(1, items)}`;
    });
  const q = new URLSearchParams({
    adults: String(stay.adults),
    children: String(stay.children),
  });
  if (stay.unitId) q.set("unit", stay.unitId);
  if (services.length) q.set("services", services.join(","));
  return `/p/${stay.property.slug}?${q}#termin`;
}

export async function StatusBadge({ status }: { status: Stay["status"] }) {
  const t = await getTranslations("guest.reservation.status");
  return (
    <Badge variant={status === "confirmed" || status === "in_progress" ? "default" : "secondary"}>
      {t(status as "confirmed")}
    </Badge>
  );
}

/** One stay as a row (lists) or as the big card (nearest stay). */
export async function StayCard({ stay, big }: { stay: Stay; big?: boolean }) {
  const [t, tb, locale] = await Promise.all([
    getTranslations("guest.account"),
    getTranslations("guest.booking"),
    getLocale(),
  ]);
  const rebook = rebookHref(stay);
  return (
    <article
      className={cn(
        "guest-card grid gap-4 rounded-lg p-5",
        big && "shadow-[0_24px_60px_-40px_rgba(17,33,47,0.25)] sm:grid-cols-[220px_1fr] sm:p-6",
      )}
    >
      {big && stay.property?.photo ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:aspect-auto">
          <Image
            src={stay.property.photo}
            alt=""
            fill
            sizes="(min-width: 640px) 220px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink text-lg font-bold tracking-tight">
            {stay.property?.name ?? "—"}
          </span>
          <StatusBadge status={stay.status} />
        </div>
        <p className="text-ink">
          {formatDate(stay.checkIn, locale)} – {formatDate(stay.checkOut, locale)} ·{" "}
          {tb("nights", { count: diffDays(stay.checkIn, stay.checkOut) })}
        </p>
        <p className="text-muted-foreground text-sm">
          {stay.number} · {formatMoney(money(stay.total_cents, stay.currency), locale)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/ucet/pobyt/${stay.id}`}
            className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium"
          >
            {t("detail")}
          </Link>
          {rebook ? (
            <Link
              href={rebook}
              className="border-line text-ink inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium"
            >
              {t("rebook")}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
