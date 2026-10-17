import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { reservationByToken } from "@/core/booking/reservation-view";
import { getTenantFromHost } from "@/core/tenant/current";
import { CheckinScreen } from "@/modules/checkin/guest/screen";
import { loadGuestCheckin } from "@/modules/checkin/guest/load";

/** Online check-in behind the access link of the reservation (Z39) — no account needed. */
export default async function LinkCheckinPage({
  params,
  searchParams,
}: PageProps<"/r/[token]/checkin">) {
  const [{ token }, query, tenant] = await Promise.all([params, searchParams, getTenantFromHost()]);
  const r = await reservationByToken(token);
  if (!r || (tenant && r.tenant_id !== tenant.id)) notFound();
  const data = await loadGuestCheckin(r.id, token);
  if (!data || data.window === "module_off") notFound();
  return (
    <CheckinScreen
      data={data}
      token={token}
      locale={await getLocale()}
      backHref={`/r/${token}`}
      done={data.status === "completed" && !query.upravit}
    />
  );
}
