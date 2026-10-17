import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { SyncState } from "./occupancy";
import { OCCUPANCY_CLASS, type OccupancyKind } from "./status";

/** Legend of the occupancy colours (rule 4) — overview and calendar. */
export async function OccupancyLegend({ className }: { className?: string }) {
  const t = await getTranslations("adminV1.legend");
  const kinds: OccupancyKind[] = ["direct", "pending", "portal", "block"];
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-normal",
        className,
      )}
    >
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded-[3px]", OCCUPANCY_CLASS[k])} />
          {t(k)}
        </span>
      ))}
    </div>
  );
}

/** "Booking a Airbnb synchronizované pred 4 min · bez kolízií" (warm with a link when there is a problem). */
export async function SyncLine({ sync }: { sync: SyncState }) {
  const t = await getTranslations("adminV1.sync");
  if (sync.channels === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-2.5 text-[13px] font-normal">
        <span className="size-2 rounded-full bg-[#c9cdd2]" />
        {t("none")}{" "}
        <Link
          href="/admin/ical"
          className="text-ink font-medium underline-offset-4 hover:underline"
        >
          {t("setUp")}
        </Link>
      </p>
    );
  }
  const minutes = sync.minutesAgo;
  const ago =
    minutes === null
      ? t("never")
      : minutes < 60
        ? t("minutesAgo", { minutes })
        : t("hoursAgo", { hours: Math.round(minutes / 60) });
  if (sync.problem) {
    return (
      <p className="card-warm flex flex-wrap items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[13px] font-normal text-[#5b3a1f]">
        <span className="size-2 rounded-full bg-[#c07a3e]" />
        {t(sync.problem)} · {ago}
        <Link href={sync.href} className="font-medium underline underline-offset-4">
          {t("check")}
        </Link>
      </p>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2.5 text-[13px] font-normal">
      <span className="size-2 rounded-full bg-[#3f8f5a]" />
      {t("ok", { ago })}
    </p>
  );
}
