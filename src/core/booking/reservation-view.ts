import "server-only";
import { cache } from "react";
import { photoUrl } from "@/core/booking/photo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { googleDirectionsUrl } from "@/core/maps/config";

export type ReservationSummary = {
  id: string;
  tenant_id: string;
  property_id: string;
  number: string;
  status:
    | "awaiting_approval"
    | "pending_payment"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";
  /** Z77: the way to pay and until when the owner approves. */
  payment_method?: string;
  approval_due_at?: string | null;
  voucher_amount_cents?: number | null;
  guest_name: string;
  guest_email: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  currency: string;
  total_cents: number;
  payment_due_at: string | null;
  cancellation_requested_at: string | null;
  check_in: string;
  check_out: string;
  property_name: string;
  property_slug: string;
  lines: {
    kind: string;
    label: string;
    quantity: number;
    unit_amount_cents: number;
    amount_cents: number;
  }[];
  payment: { status: string; variable_symbol: string; amount_cents: number } | null;
  bank: { iban: string | null; account_holder: string | null; bic: string | null } | null;
};

/** Reservation behind the secret link (no account needed). Null for an invalid or unknown token. */
export const reservationByToken = cache(async (token: string) => {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("reservation_by_token", { p_token: token });
  return (data as ReservationSummary | null) ?? null;
});

/** Public address of the tenant (its own domain, never a technical one) — the link must always lead there. */
export async function tenantPublicHost(tenantId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("tenant_domains")
    .select("hostname, is_primary")
    .eq("tenant_id", tenantId);
  const list = (data ?? []).filter((d) => !d.hostname.endsWith(".localhost"));
  return (list.find((d) => d.is_primary) ?? list[0])?.hostname ?? null;
}

/**
 * Everything else the confirmation page shows (v2.1): the property photo and check-in times, payment date, extras,
 * place for the calendar file (address only when the owner shows the exact place), contact and settings.
 * Read with the server key only after the secret token matched the reservation.
 */
export async function reservationExtras(r: ReservationSummary) {
  const admin = createAdminClient();
  const [{ data: res }, { data: property }, { data: payment }, { data: settings }, { data: loc }] =
    await Promise.all([
      admin.from("reservations").select("cancelled_reason, created_at").eq("id", r.id).single(),
      admin
        .from("properties")
        .select(
          "check_in_from, check_out_until, city, location_mode, street, postal_code, latitude, longitude, photos(storage_path, alt, sort, category)",
        )
        .eq("id", r.property_id)
        .single(),
      admin
        .from("payments")
        .select("status, received_at, amount_cents")
        .eq("reservation_id", r.id)
        .eq("purpose", "reservation")
        .maybeSingle(),
      admin
        .from("tenant_settings")
        .select(
          "arrival_email_days_before, cancellation_policy, contact_name, contact_phone, whatsapp_phone, website_url",
        )
        .eq("tenant_id", r.tenant_id)
        .maybeSingle(),
      admin.rpc("property_public_location", { p_property_id: r.property_id }).maybeSingle(),
    ]);
  const photos = [...(property?.photos ?? [])].sort((a, b) => a.sort - b.sort);
  const cover = photos.find((p) => p.category === "exterior") ?? photos[0];
  const exact = property?.location_mode === "exact";
  return {
    cancelledReason: res?.cancelled_reason ?? null,
    checkInFrom: property?.check_in_from?.slice(0, 5) ?? null,
    checkOutUntil: property?.check_out_until?.slice(0, 5) ?? null,
    city: property?.city ?? null,
    address: exact
      ? [property?.street, [property?.postal_code, property?.city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ")
      : (property?.city ?? null),
    exactLocation: Boolean(exact && loc),
    // Z40: navigation to the exact place — with an approximate location only once the stay is confirmed.
    navigation:
      property?.latitude != null &&
      property?.longitude != null &&
      (exact || ["confirmed", "in_progress"].includes(r.status))
        ? googleDirectionsUrl(Number(property.latitude), Number(property.longitude))
        : null,
    cover: cover ? { url: photoUrl(cover.storage_path), alt: "" } : null,
    paidAt: payment?.status === "received" ? payment.received_at : null,
    arrivalDays: settings?.arrival_email_days_before ?? 3,
    cancellationPolicy: (settings?.cancellation_policy ?? {}) as Record<string, string>,
    contact: settings
      ? {
          name: settings.contact_name,
          phone: settings.contact_phone,
          whatsapp: settings.whatsapp_phone,
        }
      : null,
  };
}
