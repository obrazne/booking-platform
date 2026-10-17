import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { listStays, requireGuest } from "@/core/guest/zone";
import { stayCrumbs } from "../../../stay-crumbs";
import { CheckinScreen } from "@/modules/checkin/guest/screen";
import { loadGuestCheckin } from "@/modules/checkin/guest/load";

/** Online check-in of a stay in the guest's account (Z39; e-mails link here). */
export default async function StayCheckinPage({
  params,
  searchParams,
}: PageProps<"/ucet/pobyt/[id]/checkin">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireGuest();
  const stay = (await listStays()).find((s) => s.id === id);
  if (!stay) notFound();
  const data = await loadGuestCheckin(stay.id);
  if (!data || data.window === "module_off") notFound();
  return (
    <CheckinScreen
      data={data}
      locale={await getLocale()}
      backHref={`/ucet/pobyt/${stay.id}`}
      crumbs={await stayCrumbs(stay, true)}
      done={data.status === "completed" && !query.upravit}
    />
  );
}
