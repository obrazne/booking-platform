import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { loadCollisions, type Collision } from "@/core/admin/collisions";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { StatusPill } from "@/core/admin/status";
import { formatDate } from "@/core/format/format";
import { closedOnPortal, portalName } from "./panel-content";
import { loadCollisionPanel } from "./panel-loader";

/** Changes with every server render — tells the open panel to load its detail again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

/**
 * Rezervácie › Kolízie (Z42): dates a portal calendar wants but which are taken here — open ones first, resolved
 * below for the history. A row opens the panel of the collision (what collides with what, what to do).
 * A page of its own rather than a filter of the calendar: collisions are rare and spread over months, the calendar
 * shows two months of one unit.
 */
export default async function CollisionsPage() {
  const active = await requireTenant();
  const [t, tr, locale, list] = await Promise.all([
    getTranslations("collisions"),
    getTranslations("reservations"),
    getLocale(),
    loadCollisions(active.tenantId),
  ]);
  const open = list.filter((c) => !c.resolvedAt);
  const resolved = list.filter((c) => c.resolvedAt);

  const row = (c: Collision) => {
    const reservation = c.overlaps.find((o) => o.reservation)?.reservation;
    const block = c.overlaps.find((o) => o.kind === "block");
    return (
      <PanelLink
        key={c.id}
        type="collision"
        id={c.id}
        className="border-line grid items-center gap-x-4 gap-y-1 border-b px-2 py-4 transition-colors hover:bg-[#fbfaf7] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]"
      >
        <span className="grid gap-0.5">
          <span className="text-ink text-[15px] font-bold">
            {formatDate(c.checkIn, locale, "short")} – {formatDate(c.checkOut, locale, "short")}
          </span>
          <span className="text-[13px] text-[#5a6672]">
            {closedOnPortal(c.label)
              ? t("closedOn", { portal: portalName(c) })
              : t("stayOn", { portal: portalName(c) })}
          </span>
        </span>
        <span className="text-ink min-w-0 truncate text-sm">
          {reservation
            ? t("withReservation", { number: reservation.number, guest: reservation.guestName })
            : block
              ? t("blockLabel", { label: block.label ?? "—" })
              : c.overlaps.length
                ? t("otherLabel", { channel: c.overlaps[0]!.channel ?? "iCal" })
                : t("nothingNow")}
        </span>
        <span className="flex items-center gap-2">
          {reservation ? (
            <StatusPill
              status={reservation.status}
              label={tr(`statuses.${reservation.status as "confirmed"}`)}
            />
          ) : null}
          <StatusPill
            status={c.resolvedAt ? "completed" : "pending_payment"}
            label={c.resolvedAt ? t("resolved") : t("open")}
          />
        </span>
      </PanelLink>
    );
  };

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="grid gap-10 px-5 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-3xl text-sm font-normal">{t("lead")}</p>
        <section className="grid gap-2" aria-labelledby="collisions-open">
          <h2 id="collisions-open" className="label-mono">
            {t("openTitle", { count: open.length })}
          </h2>
          {open.length ? (
            <div className="border-line border-t">{open.map(row)}</div>
          ) : (
            <p className="text-muted-foreground py-6 text-sm">{t("noneOpen")}</p>
          )}
        </section>
        {resolved.length ? (
          <section className="grid gap-2" aria-labelledby="collisions-resolved">
            <h2 id="collisions-resolved" className="label-mono">
              {t("resolvedTitle", { count: resolved.length })}
            </h2>
            <div className="border-line border-t">{resolved.map(row)}</div>
          </section>
        ) : null}
      </div>
      <UrlPanel
        type="collision"
        load={loadCollisionPanel}
        version={renderVersion()}
        backLabel={t("title")}
      />
    </div>
  );
}
