import { notFound } from "next/navigation";
import { listStays } from "@/core/guest/zone";
import { stayCrumbs } from "../../stay-crumbs";
import { StayDetail } from "./stay-detail";

/**
 * One stay in the guest zone (B10, v2.3–v2.4). The content and its states are in `StayDetail` (Z44); the account tabs
 * and the breadcrumbs (Z43) belong here — pass the breadcrumbs as `crumbs`.
 */
export default async function StayPage({ params }: PageProps<"/ucet/pobyt/[id]">) {
  const { id } = await params;
  const stay = (await listStays()).find((s) => s.id === id);
  if (!stay) notFound();
  return <StayDetail id={id} crumbs={await stayCrumbs(stay)} />;
}
