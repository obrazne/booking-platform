import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReportView } from "./monthly-view";

const TONE: Record<string, string> = {
  direct: "bg-primary text-primary-foreground",
  booking: "bg-[#8fb5a5] text-[#11212f]",
  airbnb: "bg-[#c9ddd4] text-[#11212f]",
  other: "bg-[#dfe7e3] text-[#11212f]",
  free: "bg-[#f4f3ef] text-[#5a6672]",
};

/**
 * "Kde sa predali noci" (Z62, Z65): nights of a month by channel and the free ones — one bar, counts also in words
 * (the legend). The same component and numbers (`reportView`) for the monthly report and the Overview; with `href`
 * every part of the bar opens the calendar of the month.
 */
export function NightsBar({
  view,
  freeLabel,
  nightsLabel,
  href,
  openLabel,
}: {
  view: Pick<ReportView, "channels" | "freeNights">;
  freeLabel: string;
  nightsLabel: (count: number) => string;
  href?: string;
  openLabel?: string;
}) {
  const legend = [...view.channels, { key: "free", name: freeLabel, nights: view.freeNights }];
  const parts = legend.filter((c) => c.nights > 0);
  const segment = "flex min-w-0 items-center border-r border-white px-3 text-[13px] font-bold";
  return (
    <div className="grid gap-3">
      <div className="flex h-10 overflow-hidden rounded-lg" aria-hidden={href ? undefined : true}>
        {parts.map((c) =>
          href ? (
            <Link
              key={c.key}
              href={href}
              style={{ flex: `${c.nights} 1 0` }}
              aria-label={`${c.name} · ${nightsLabel(c.nights)} — ${openLabel}`}
              className={cn(segment, TONE[c.key], "transition-opacity hover:opacity-85")}
            >
              {c.nights}
            </Link>
          ) : (
            <span
              key={c.key}
              style={{ flex: `${c.nights} 1 0` }}
              className={cn(segment, TONE[c.key])}
            >
              {c.nights}
            </span>
          ),
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
        {legend.map((c) => (
          <li key={c.key} className="flex items-center gap-2">
            <span className={cn("size-3.5 rounded border border-[#c9c5ba]", TONE[c.key])} />
            {c.name} · {nightsLabel(c.nights)}
          </li>
        ))}
      </ul>
    </div>
  );
}
