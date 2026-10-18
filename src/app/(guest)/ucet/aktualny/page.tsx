import { redirect } from "next/navigation";
import { currentStay } from "@/core/guest/current-stay";
import { listStays } from "@/core/guest/zone";
import { todayIso } from "@/core/pricing/dates";

/**
 * Where the guest lands after signing in (Z59): the current stay (going on, else the nearest coming), without one the
 * list of stays.
 */
export default async function CurrentStayPage() {
  const current = currentStay(await listStays(), todayIso());
  redirect(current ? `/ucet/pobyt/${current.id}` : "/ucet");
}
