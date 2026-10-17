import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { listStays, requireGuest } from "@/core/guest/zone";
import { loadGuestMessages } from "@/modules/messages/guest/load";
import { MessagesScreen } from "@/modules/messages/guest/screen";

/** Messages of a stay on their own screen in the guest's account (Z47; phones and the e-mail link). */
export default async function StayMessagesPage({ params }: PageProps<"/ucet/pobyt/[id]/spravy">) {
  const { id } = await params;
  await requireGuest();
  const stay = (await listStays()).find((s) => s.id === id);
  if (!stay) notFound();
  const locale = await getLocale();
  const data = await loadGuestMessages(stay.id, locale);
  if (!data) notFound();
  return (
    <MessagesScreen
      data={data}
      reservationId={stay.id}
      locale={locale}
      backHref={`/ucet/pobyt/${stay.id}`}
    />
  );
}
