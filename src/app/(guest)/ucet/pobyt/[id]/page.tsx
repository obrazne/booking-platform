import { StayDetail } from "./stay-detail";

/**
 * One stay in the guest zone (B10, v2.3–v2.4). The content and its states are in `StayDetail` (Z44); the account tabs
 * and the breadcrumbs (Z43) belong here — pass the breadcrumbs as `crumbs`.
 */
export default async function StayPage({ params }: PageProps<"/ucet/pobyt/[id]">) {
  const { id } = await params;
  return <StayDetail id={id} />;
}
