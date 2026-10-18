import "server-only";
import { notFound } from "next/navigation";
import { reservationByToken } from "@/core/booking/reservation-view";
import { getTenantFromHost } from "@/core/tenant/current";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listStays, requireGuest, STAY_COLUMNS, stayDocuments, toStays, type Stay } from "./zone";

/** How the guest came to the stay: signed in to the account, or with the secret code of the access link (Z49). */
export type StayAccess = { id: string } | { token: string };

/**
 * One stay with what its detail needs (Z44, Z49): through the account (RLS of the guest) or through the access link
 * (the code verified in the database first, then read with the server key — like the confirmation page v2.1).
 */
export async function loadStay(access: StayAccess) {
  if ("id" in access) {
    const { tenant, supabase } = await requireGuest();
    const stay = (await listStays()).find((s) => s.id === access.id);
    if (!stay) notFound();
    const [docs, { data: state }] = await Promise.all([
      stayDocuments(stay),
      supabase.rpc("guest_stay_state", { p_reservation_id: stay.id }),
    ]);
    return { tenant, stay, docs, state };
  }
  const [tenant, r] = await Promise.all([getTenantFromHost(), reservationByToken(access.token)]);
  if (!tenant || !r || r.tenant_id !== tenant.id) notFound();
  const { data: row } = await createAdminClient()
    .from("reservations")
    .select(STAY_COLUMNS)
    .eq("id", r.id)
    .eq("tenant_id", tenant.id)
    .eq("payments.purpose", "reservation")
    .single();
  if (!row) notFound();
  const [stay] = await toStays([row], tenant.id);
  const supabase = await createClient();
  const [docs, { data: state }] = await Promise.all([
    documentsOf(stay!, tenant.id),
    supabase.rpc("guest_stay_state", { p_reservation_id: r.id, p_token: access.token }),
  ]);
  return { tenant, stay: stay!, docs, state };
}

/** Documents of a stay as the guest's RLS shows them (`documents_select`), for the access link. */
async function documentsOf(stay: Stay, tenantId: string) {
  const admin = createAdminClient();
  const confirmed = ["confirmed", "in_progress", "completed"].includes(stay.status);
  const { data } = await admin
    .from("documents")
    .select("id, title, storage_path, visible_when, kind")
    .eq("tenant_id", tenantId)
    .or(`reservation_id.eq.${stay.id},property_id.eq.${stay.property_id}`);
  // Issued documents (invoices, Z51) are the guest's in any state; files for guests by their visibility.
  const list = (data ?? []).filter(
    (d) => d.kind === "invoice" || d.visible_when === "always" || confirmed,
  );
  if (!list.length) return [];
  const { data: signed } = await admin.storage.from("guest-documents").createSignedUrls(
    list.map((d) => d.storage_path),
    600,
  );
  return list.map((d, i) => ({
    id: d.id,
    title: d.title,
    kind: d.kind,
    url: signed?.[i]?.signedUrl ?? null,
  }));
}
