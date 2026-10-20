import { reservationByToken } from "@/core/booking/reservation-view";
import { icsFile } from "@/core/guest/calendar-links";
import { stayEvent } from "@/core/guest/stay-calendar";
import { getTenantFromHost, requestHost } from "@/core/tenant/current";

/**
 * "Apple / iný kalendár" (v2.1, Z72): the stay as an .ics file — arrival from the check-in time to the departure until
 * the check-out time in the client's time zone (all-day without the times). Not iCal synchronisation.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [r, tenant, host] = await Promise.all([
    reservationByToken(token),
    getTenantFromHost(),
    requestHost(),
  ]);
  if (!r || (tenant && tenant.id !== r.tenant_id))
    return new Response("Not found", { status: 404 });
  const event = await stayEvent(r.id, `https://${host}/r/${token}`);
  if (!event) return new Response("Not found", { status: 404 });
  return new Response(icsFile(event, `${r.id}@booking-platform`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pobyt-${r.number}.ics"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
