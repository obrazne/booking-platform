import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { photoUrl } from "@/core/booking/photo";
import { getTenantFromHost } from "@/core/tenant/current";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { googleDirectionsUrl } from "@/core/maps/config";

export type Stay = Awaited<ReturnType<typeof listStays>>[number];

/** Signed-in guest of the tenant of this domain (B10); others go to the login. */
export const requireGuest = cache(async () => {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/ucet/prihlasenie");
  let { data: guestId } = await supabase.rpc("current_guest_id", { p_tenant_id: tenant.id });
  if (!guestId) {
    // First visit at this tenant with a verified e-mail: link the guest record (past stays appear).
    const claimed = await supabase.rpc("claim_guest_account", { p_tenant_id: tenant.id });
    guestId = claimed.data ?? null;
  }
  if (!guestId) redirect("/ucet/prihlasenie");
  const { data: guest } = await supabase
    .from("guests")
    .select("id, email, name, phone, country, marketing_consent")
    .eq("id", guestId)
    .single();
  if (!guest) redirect("/ucet/prihlasenie");
  return { tenant, supabase, guest };
});

/** Columns of a stay (account list, Z44 detail, access link Z49). */
export const STAY_COLUMNS =
  "id, number, status, adults, children, infants, pets, currency, total_cents, payment_due_at, cancellation_requested_at, property_id, items:reservation_items(check_in, check_out, unit_id), lines:reservation_lines(kind, ref_id, label, quantity, unit_amount_cents, amount_cents, meta, sort), payments(status, variable_symbol, amount_cents, provider)";

/** The guest's stays at this tenant (RLS: only own reservations), newest arrival first. */
export const listStays = cache(async () => {
  const { tenant, supabase, guest } = await requireGuest();
  const { data } = await supabase
    .from("reservations")
    .select(STAY_COLUMNS)
    .eq("tenant_id", tenant.id)
    .eq("guest_id", guest.id)
    .eq("payments.purpose", "reservation");
  return toStays(data ?? [], tenant.id);
});

/** Reservation rows (`STAY_COLUMNS`) as stays: dates, sorted lines, payment, property name and photo. */
export async function toStays<
  R extends {
    property_id: string;
    items: { check_in: string; check_out: string; unit_id: string }[];
    lines: { sort: number }[];
    payments: { status: string; provider: string }[];
  },
>(rows: R[], tenantId: string) {
  // Property names and photos (also of properties no longer published) through the server.
  const ids = [...new Set(rows.map((r) => r.property_id))];
  const { data: props } = ids.length
    ? await createAdminClient()
        .from("properties")
        .select("id, slug, name, status, photos(storage_path, alt, sort)")
        .in("id", ids)
        .eq("tenant_id", tenantId)
    : { data: [] };
  return rows
    .map((r) => {
      const item = r.items[0];
      const prop = (props ?? []).find((p) => p.id === r.property_id);
      const photo = prop ? [...prop.photos].sort((a, b) => a.sort - b.sort)[0] : undefined;
      return {
        ...r,
        checkIn: item?.check_in ?? "",
        checkOut: item?.check_out ?? "",
        unitId: item?.unit_id ?? null,
        lines: [...r.lines].sort((a, b) => a.sort - b.sort) as R["lines"],
        // Z77: the payment to transfer — with a recreation voucher the open rest, not the voucher.
        payment: (r.payments.find(
          (p) => p.status === "pending" && p.provider !== "recreation_voucher",
        ) ??
          r.payments[0] ??
          null) as R["payments"][number] | null,
        property: prop
          ? {
              slug: prop.slug,
              name: prop.name,
              published: prop.status === "published",
              photo: photo ? photoUrl(photo.storage_path) : null,
            }
          : null,
      };
    })
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
}

/** Bank details for paying a stay (tenant settings are not readable by guests directly). */
export async function bankDetails(tenantId: string) {
  const { data } = await createAdminClient()
    .from("tenant_settings")
    .select("iban, bic, account_holder")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data;
}

/** Documents of the stay visible to the guest (RLS decides), with links valid for 10 minutes. */
export async function stayDocuments(stay: Stay) {
  const { supabase } = await requireGuest();
  const { data } = await supabase
    .from("documents")
    .select("id, title, storage_path, reservation_id, property_id, kind")
    .or(`reservation_id.eq.${stay.id},property_id.eq.${stay.property_id}`);
  if (!data?.length) return [];
  const { data: signed } = await createAdminClient()
    .storage.from("guest-documents")
    .createSignedUrls(
      data.map((d) => d.storage_path),
      600,
    );
  return data.map((d, i) => ({
    id: d.id,
    title: d.title,
    kind: d.kind,
    url: signed?.[i]?.signedUrl ?? null,
  }));
}

/** Arrival instructions and codes — null until the rules of Z13 allow them. */
/** Navigation to the exact place of a stay whose arrival instructions are visible (Z40). */
export async function arrivalNavigation(propertyId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("properties")
    .select("latitude, longitude")
    .eq("id", propertyId)
    .maybeSingle();
  return data?.latitude != null && data?.longitude != null
    ? googleDirectionsUrl(Number(data.latitude), Number(data.longitude))
    : null;
}

export async function arrivalInstructions(reservationId: string) {
  const { supabase } = await requireGuest();
  const { data } = await supabase.rpc("guest_arrival_instructions", {
    p_reservation_id: reservationId,
  });
  return (data ?? null) as Record<string, string> | null;
}
