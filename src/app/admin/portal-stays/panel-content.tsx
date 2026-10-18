import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { loadPortalStays } from "@/core/admin/portal-stays";
import { PanelSummary, type PanelContent } from "@/core/admin/record-panel";
import { formatDate, formatDateTime } from "@/core/format/format";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { closedOnPortal } from "../collisions/panel-content";

export const PORTAL_NAMES: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb" };

/**
 * Panel of a stay from a portal (Z58, A18): everything the platform knows about it — portal and calendar, dates,
 * nights, the code / link of the reservation and the phone's last digits (when the portal sends them), the text of
 * the event, collision, last synchronisation — and "Zobraziť v kalendári". Read only.
 */
export async function portalStayPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, tr, locale, tenant, [s]] = await Promise.all([
    getTranslations("portalStays"),
    getTranslations("reservations"),
    getLocale(),
    getTenantInfo(active.tenantId),
    loadPortalStays(active.tenantId, id),
  ]);
  if (!s) return { body: <p className="text-muted-foreground text-sm">{t("emptyFilter")}</p> };
  const portal = PORTAL_NAMES[s.portal] ?? t("other");
  const date = (d: string) => formatDate(d, locale, "short");
  return {
    label: t("panelLabel", { from: date(s.checkIn), to: date(s.checkOut) }),
    header: (
      <>
        <span className="text-ink font-mono text-[13px] font-medium">{t("kicker")}</span>
        <span className="rounded-full bg-[#eef0f3] px-2.5 py-1 text-xs font-bold text-[#3b4652]">
          {portal}
        </span>
      </>
    ),
    body: (
      <div className="grid gap-7">
        <PanelSummary
          title={`${date(s.checkIn)} – ${date(s.checkOut)}`}
          subtitle={[
            portal,
            s.channelName,
            [s.propertyName, s.unitName].filter(Boolean).join(" · "),
          ]
            .filter(Boolean)
            .join(" · ")}
          facts={[
            { label: t("nights"), value: tr("nights", { count: diffDays(s.checkIn, s.checkOut) }) },
            {
              label: t("reference"),
              value: s.code ?? (s.url ? t("openOnPortal") : "—"),
            },
            { label: t("phoneLabel"), value: s.phone4 ? `…${s.phone4}` : "—" },
            {
              label: t("lastSync"),
              value: s.lastSyncAt
                ? formatDateTime(s.lastSyncAt, locale, tenant.timezone)
                : t("never"),
            },
            { label: t("known"), value: formatDateTime(s.createdAt, locale, tenant.timezone) },
            { label: t("event"), value: closedOnPortal(s.label) ? t("closed") : (s.label ?? "—") },
          ]}
        />
        {!s.code && !s.url && !s.phone4 ? (
          <p className="text-muted-foreground text-sm">{t("noDetails")}</p>
        ) : null}
        {s.conflict ? (
          <p role="note" className="card-warm rounded-[10px] px-4 py-3 text-sm text-[#5b3a1f]">
            <Link
              href={`/admin/collisions?panel=collision:${s.id}`}
              className="font-semibold underline underline-offset-4"
            >
              {t("collisionLink")}
            </Link>
          </p>
        ) : null}
      </div>
    ),
    actions: (
      <>
        {s.url ? (
          <Button asChild variant="outline">
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {t("openOnPortal")}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link
            href={`/admin/calendar?month=${s.checkIn.slice(0, 7)}&unit=${s.unitId}&highlight=${s.id}`}
          >
            <CalendarDays /> {t("showInCalendar")}
          </Link>
        </Button>
      </>
    ),
  };
}
