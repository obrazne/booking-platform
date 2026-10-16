import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { addDays, diffDays, isoWeekday, todayIso } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function monthOf(v: string | string[] | undefined): string {
  const s = typeof v === "string" && /^\d{4}-\d{2}$/.test(v) ? v : todayIso().slice(0, 7);
  return `${s}-01`;
}

function shiftMonth(first: string, n: number): string {
  const [y, m] = first.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
}

type Bar = {
  id: string;
  kind: string;
  start: number;
  span: number;
  label: string;
  href: string | null;
  tone: string;
};

/** Occupancy calendar (B8): month × units with reservations, holds, owner blocks and iCal events. */
export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const active = await requireTenant();
  const [t, tr, locale, sp] = await Promise.all([
    getTranslations("calendarAdmin"),
    getTranslations("reservations"),
    getLocale(),
    searchParams,
  ]);
  const first = monthOf(sp.month);
  const nextFirst = `${shiftMonth(first, 1)}-01`;
  const days = diffDays(first, nextFirst);
  const today = todayIso();
  const supabase = await createClient();
  const [{ data: units }, { data: occ }] = await Promise.all([
    supabase
      .from("units")
      .select("id, name, sort, property:properties(name, booking_mode, sort)")
      .eq("tenant_id", active.tenantId)
      .eq("active", true),
    supabase
      .from("occupancy")
      .select(
        "id, unit_id, nights, kind, label, conflict, is_blocking, expires_at, reservation:reservations(id, number, guest_name, status)",
      )
      .eq("tenant_id", active.tenantId)
      .overlaps("nights", `[${first},${nextFirst})`),
  ]);
  const sorted = [...(units ?? [])].sort(
    (a, b) =>
      (a.property?.sort ?? 0) - (b.property?.sort ?? 0) ||
      (a.property?.name ?? "").localeCompare(b.property?.name ?? "") ||
      a.sort - b.sort,
  );

  const bars = (unitId: string): Bar[] =>
    (occ ?? [])
      .filter((o) => o.unit_id === unitId)
      .filter((o) => o.is_blocking || o.conflict)
      .filter((o) => o.kind !== "hold" || (o.expires_at && o.expires_at > new Date().toISOString()))
      .flatMap((o) => {
        const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(o.nights));
        if (!m) return [];
        const from = m[1]! < first ? first : m[1]!;
        const to = m[2]! > nextFirst ? nextFirst : m[2]!;
        const start = diffDays(first, from);
        const span = Math.max(1, diffDays(from, to));
        const r = o.reservation;
        const tone = o.conflict
          ? "bg-destructive/15 text-destructive border-destructive/40 border-dashed"
          : o.kind === "reservation"
            ? r?.status === "pending_payment"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40"
              : "bg-primary/15 text-primary border-primary/40"
            : o.kind === "ical"
              ? "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/40"
              : o.kind === "hold"
                ? "bg-muted text-muted-foreground border-dashed"
                : "bg-muted text-foreground border-border";
        return [
          {
            id: o.id,
            kind: o.kind,
            start,
            span,
            label: r
              ? `${r.number} · ${r.guest_name}`
              : o.kind === "block"
                ? (o.label ?? t("legend.block"))
                : o.kind === "ical"
                  ? (o.label ?? "iCal")
                  : t("legend.hold"),
            href: r
              ? `/admin/reservations?panel=reservation:${r.id}`
              : o.kind === "block"
                ? "/admin/blocks"
                : null,
            tone,
          },
        ];
      });

  const fmtMonth = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dayList = Array.from({ length: days }, (_, i) => addDays(first, i));
  const cols = `minmax(9rem,12rem) repeat(${days}, minmax(2rem, 1fr))`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading mr-auto text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild variant="ghost" size="icon" aria-label={t("prev")}>
          <Link href={`/admin/calendar?month=${shiftMonth(first, -1)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <span className="min-w-36 text-center font-medium capitalize">
          {fmtMonth.format(new Date(`${first}T00:00:00Z`))}
        </span>
        <Button asChild variant="ghost" size="icon" aria-label={t("next")}>
          <Link href={`/admin/calendar?month=${shiftMonth(first, 1)}`}>
            <ChevronRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/calendar">{t("today")}</Link>
        </Button>
      </div>

      <div className="border-border overflow-x-auto rounded-xl border">
        <div className="grid min-w-max text-xs" style={{ gridTemplateColumns: cols }}>
          <div className="bg-background border-border sticky left-0 z-10 border-r border-b" />
          {dayList.map((d) => (
            <div
              key={d}
              className={cn(
                "border-border border-b py-1.5 text-center",
                isoWeekday(d) >= 6 && "bg-muted/50",
                d === today && "bg-primary/10 font-semibold",
              )}
            >
              <span className="block">{Number(d.slice(8))}</span>
            </div>
          ))}
          {sorted.length === 0 ? (
            <p className="text-muted-foreground col-span-full p-6">{t("empty")}</p>
          ) : (
            sorted.map((u) => (
              <div key={u.id} className="contents">
                <div className="bg-background border-border sticky left-0 z-10 truncate border-r border-b px-3 py-2 text-sm">
                  {u.property?.booking_mode === "units" ? (
                    <>
                      <span className="text-muted-foreground block truncate text-xs">
                        {u.property.name}
                      </span>
                      {u.name}
                    </>
                  ) : (
                    (u.property?.name ?? u.name)
                  )}
                </div>
                <div
                  className="border-border relative col-span-full grid border-b"
                  style={{
                    gridColumn: `2 / span ${days}`,
                    gridTemplateColumns: `repeat(${days}, minmax(2rem, 1fr))`,
                  }}
                >
                  {dayList.map((d) => (
                    <div
                      key={d}
                      className={cn(
                        "h-12",
                        isoWeekday(d) >= 6 && "bg-muted/30",
                        d === today && "bg-primary/5",
                      )}
                    />
                  ))}
                  {bars(u.id).map((b) => {
                    const style = { gridColumn: `${b.start + 1} / span ${b.span}`, gridRow: 1 };
                    const cls = cn(
                      "z-[1] m-1 flex items-center truncate rounded-md border px-1.5 text-[11px]",
                      b.tone,
                    );
                    return b.href ? (
                      <Link
                        key={b.id}
                        href={b.href}
                        style={style}
                        className={cn(cls, "hover:brightness-95")}
                        title={b.label}
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span key={b.id} style={style} className={cls} title={b.label}>
                        {b.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary/15 border-primary/40 size-3 rounded border" />
          {tr("statuses.confirmed")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-amber-500/40 bg-amber-500/15" />
          {t("legend.pending")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted border-border size-3 rounded border" />
          {t("legend.block")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-sky-500/40 bg-sky-500/15" />
          {t("legend.ical")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-destructive/15 border-destructive/40 size-3 rounded border border-dashed" />
          {t("legend.conflict")}
        </span>
      </div>
    </div>
  );
}
