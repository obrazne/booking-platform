import { getTranslations } from "next-intl/server";
import { reservationByToken, reservationExtras } from "@/core/booking/reservation-view";
import { getTenantFromHost, requestHost } from "@/core/tenant/current";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const day = (iso: string) => iso.replaceAll("-", "");

/**
 * "Add to calendar" (v2.1): one all-day event for the stay as an .ics file — not iCal synchronisation.
 * The address is included only when the owner shows the exact place (B1); otherwise just the town.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [r, tenant, host, t] = await Promise.all([
    reservationByToken(token),
    getTenantFromHost(),
    requestHost(),
    getTranslations("guest.confirm"),
  ]);
  if (!r || (tenant && tenant.id !== r.tenant_id))
    return new Response("Not found", { status: 404 });
  const x = await reservationExtras(r);
  const link = `https://${host}/r/${token}`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//booking-platform//stay//SK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@booking-platform`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${day(r.check_in)}`,
    `DTEND;VALUE=DATE:${day(r.check_out)}`,
    `SUMMARY:${esc(t("icsSummary", { property: r.property_name }))}`,
    `DESCRIPTION:${esc(t("icsDescription", { number: r.number, link }))}`,
    ...(x.address ? [`LOCATION:${esc(x.address)}`] : []),
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pobyt-${r.number}.ics"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
