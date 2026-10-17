import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { loadCollisions, type Collision } from "@/core/admin/collisions";
import { PanelSection, PanelSummary, type PanelContent } from "@/core/admin/record-panel";
import { StatusPill } from "@/core/admin/status";
import { formatDate, formatDateTime } from "@/core/format/format";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { ResolveButton } from "./resolve-button";

const PORTAL_NAMES: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb" };

/** Booking exports dates closed by hand as "CLOSED - Not available" (Z41). */
export function closedOnPortal(label: string | null): boolean {
  return /^closed\b/i.test(label ?? "");
}

export function portalName(c: Pick<Collision, "source" | "channelName">): string {
  return PORTAL_NAMES[c.source ?? ""] ?? c.channelName ?? "iCal";
}

/** Which advice fits: what the event is and what it overlaps (texts in collisions.advice.*). */
export function adviceOf(c: Collision): {
  key: "closedReservation" | "doubleBooking" | "block" | "otherCalendar" | "gone";
  vars: Record<string, string>;
} {
  const portal = portalName(c);
  const reservation = c.overlaps.find((o) => o.reservation);
  const block = c.overlaps.find((o) => o.kind === "block");
  const other = c.overlaps.find((o) => o.kind === "ical");
  if (reservation?.reservation)
    return {
      key: closedOnPortal(c.label) ? "closedReservation" : "doubleBooking",
      vars: { portal, number: reservation.reservation.number },
    };
  if (block) return { key: "block", vars: { portal, label: block.label ?? "—" } };
  if (other) return { key: "otherCalendar", vars: { portal, channel: other.channel ?? "iCal" } };
  return { key: "gone", vars: { portal } };
}

/**
 * Panel of a collision (Z42, A18): when and from where the event came, what it overlaps (reservation with number,
 * guest and state / block / another calendar), how many nights, when it was found, what to do about it.
 */
export async function collisionPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, tr, locale, tenant, [c]] = await Promise.all([
    getTranslations("collisions"),
    getTranslations("reservations"),
    getLocale(),
    getTenantInfo(active.tenantId),
    loadCollisions(active.tenantId, id),
  ]);
  if (!c) return { body: <p className="text-muted-foreground text-sm">{t("gone")}</p> };
  const portal = portalName(c);
  const advice = adviceOf(c);
  const shared = c.overlaps.reduce((m, o) => Math.max(m, o.nights), 0);
  const reservation = c.overlaps.find((o) => o.reservation)?.reservation ?? null;
  const date = (d: string) => formatDate(d, locale);
  const calendarHref = `/admin/calendar?month=${c.checkIn.slice(0, 7)}&unit=${c.unitId}&highlight=${c.id}`;

  return {
    label: t("panelLabel", { from: date(c.checkIn), to: date(c.checkOut) }),
    header: (
      <>
        <span className="text-ink font-mono text-[13px] font-medium">{t("kicker")}</span>
        <StatusPill
          status={c.resolvedAt ? "completed" : "pending_payment"}
          label={c.resolvedAt ? t("resolved") : t("open")}
        />
      </>
    ),
    body: (
      <div className="grid gap-7">
        <PanelSummary
          title={`${formatDate(c.checkIn, locale, "short")} – ${formatDate(c.checkOut, locale, "short")}`}
          subtitle={[
            closedOnPortal(c.label) ? t("closedOn", { portal }) : t("stayOn", { portal }),
            c.channelName,
            c.unitLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
          facts={[
            { label: t("nights"), value: tr("nights", { count: diffDays(c.checkIn, c.checkOut) }) },
            { label: t("overlap"), value: tr("nights", { count: shared }) },
            {
              label: t("detected"),
              value: c.detectedAt ? formatDateTime(c.detectedAt, locale, tenant.timezone) : "—",
            },
            {
              label: t("state"),
              value: c.resolvedAt ? t("resolved") : t("open"),
            },
          ]}
        />

        <p
          role="note"
          className="card-warm rounded-[10px] px-4 py-3 text-sm leading-relaxed font-normal text-[#5b3a1f]"
        >
          {t(`advice.${advice.key}`, advice.vars)}
        </p>

        <PanelSection label={t("overlapsWith")}>
          {c.overlaps.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("nothingNow")}</p>
          ) : (
            <ul className="border-line grid rounded-[10px] border">
              {c.overlaps.map((o) => (
                <li
                  key={o.id}
                  className="border-hair grid gap-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-ink font-semibold">
                      {o.reservation
                        ? `${o.reservation.number} · ${o.reservation.guestName}`
                        : o.kind === "block"
                          ? t("blockLabel", { label: o.label ?? "—" })
                          : t("otherLabel", { channel: o.channel ?? "iCal" })}
                    </span>
                    <span className="text-muted-foreground text-[13px]">
                      {date(o.checkIn)} – {date(o.checkOut)} ·{" "}
                      {t("sharedNights", { count: o.nights })}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {o.reservation ? (
                      <>
                        <StatusPill
                          status={o.reservation.status}
                          label={tr(`statuses.${o.reservation.status as "confirmed"}`)}
                        />
                        <Link
                          href={`/admin/reservations?panel=reservation:${o.reservation.id}`}
                          className="text-ink inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                        >
                          {t("openReservation")}
                        </Link>
                      </>
                    ) : o.kind === "block" ? (
                      <Link
                        href="/admin/blocks"
                        className="text-ink text-sm font-medium underline underline-offset-4"
                      >
                        {t("openBlocks")}
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelSection>

        {c.resolvedAt ? (
          <p className="text-muted-foreground text-sm">
            {t("resolvedBy", {
              date: formatDateTime(c.resolvedAt, locale, tenant.timezone),
              name: c.resolvedBy ?? "—",
            })}{" "}
            {t("reopensOnChange")}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{t("resolveHint")}</p>
        )}
      </div>
    ),
    actions: (
      <>
        {reservation ? (
          <Button asChild className="min-h-11 font-bold" variant="outline">
            <Link href={`/admin/reservations?panel=reservation:${reservation.id}`}>
              <ExternalLink /> {t("openReservation")}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-11">
          <Link href={calendarHref}>
            <CalendarDays /> {t("showInCalendar")}
          </Link>
        </Button>
        <span className="ml-auto">
          <ResolveButton id={c.id} resolved={Boolean(c.resolvedAt)} />
        </span>
      </>
    ),
  };
}
