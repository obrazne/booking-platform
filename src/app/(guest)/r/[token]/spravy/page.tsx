import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { reservationByToken } from "@/core/booking/reservation-view";
import { getTenantFromHost } from "@/core/tenant/current";
import { loadGuestMessages } from "@/modules/messages/guest/load";
import { MessagesScreen } from "@/modules/messages/guest/screen";

/** Messages behind the access link of the reservation (Z47) — no account needed; the e-mail "Odpovedať" leads here. */
export default async function LinkMessagesPage({ params }: PageProps<"/r/[token]/spravy">) {
  const [{ token }, tenant] = await Promise.all([params, getTenantFromHost()]);
  const r = await reservationByToken(token);
  if (!r || (tenant && r.tenant_id !== tenant.id)) notFound();
  const locale = await getLocale();
  const data = await loadGuestMessages(r.id, locale, token);
  if (!data) notFound();
  return (
    <MessagesScreen
      data={data}
      reservationId={r.id}
      token={token}
      locale={locale}
      backHref={`/r/${token}`}
    />
  );
}
