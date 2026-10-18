import { notFound } from "next/navigation";
import { listStays } from "@/core/guest/zone";
import { stayTop } from "../../stay-crumbs";
import { StayDetail } from "./stay-detail";

/**
 * One stay in the guest zone (B10, v2.3–v2.4). The content and its states are in `StayDetail` (Z44); the account tabs
 * and what is above the heading (Z43, Z59: "← Všetky pobyty", "Ďalší pobyt") belong here — passed as `crumbs`.
 */
export default async function StayPage({ params }: PageProps<"/ucet/pobyt/[id]">) {
  const { id } = await params;
  const stays = await listStays();
  const stay = stays.find((s) => s.id === id);
  if (!stay) notFound();
  // Z59: "← Všetky pobyty" (not the current stay) and "Ďalší pobyt ›" instead of the breadcrumbs.
  return <StayDetail id={id} crumbs={await stayTop(stay, stays)} />;
}
