import "server-only";
import { listStays, requireGuest } from "@/core/guest/zone";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewDisplayName } from "../model";

/**
 * What the stay of a signed-in guest offers for reviewing (Z38): eligibility decided by the database, the guest's
 * own review if any, the last day to review, the default display name and the client's Google link.
 */
export async function loadGuestReview(reservationId: string) {
  const { tenant, supabase, guest } = await requireGuest();
  const stay = (await listStays()).find((s) => s.id === reservationId);
  if (!stay) return null;
  const [{ data: eligibility }, { data: own }, { data: settings }] = await Promise.all([
    supabase.rpc("my_review_eligibility", { p_reservation_id: reservationId }),
    supabase
      .from("reviews")
      .select("rating, body, display_name, status, submitted_at, published_at")
      .eq("reservation_id", reservationId)
      .maybeSingle(),
    createAdminClient()
      .from("tenant_settings")
      .select("google_review_url")
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
  ]);
  const until = new Date(`${stay.checkOut}T00:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 30);
  return {
    eligibility: (eligibility as string | null) ?? "not_found",
    own,
    until: until.toISOString().slice(0, 10),
    displayName: reviewDisplayName(guest.name ?? ""),
    firstName: (guest.name ?? "").trim().split(/\s+/)[0] ?? "",
    propertyName: stay.property?.name ?? "",
    rebookHref: stay.property?.published ? `/p/${stay.property.slug}#termin` : null,
    googleUrl: settings?.google_review_url ?? null,
  };
}
