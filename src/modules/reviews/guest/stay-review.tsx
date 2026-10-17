import type { SlotProps } from "@/core/modules/types";
import { ReviewForm, ReviewThanks } from "./form";
import { loadGuestReview } from "./load";

/**
 * Review of a finished stay in the guest's account (Z38, slot guest.stay.main): the form while the database allows
 * it (stay over, not cancelled, 30 days, one per stay), the thanks once reviewed. The access link has no review —
 * the invitation leads into the account.
 */
export async function GuestStayReview({ reservationId, accessToken }: SlotProps) {
  if (!reservationId || accessToken) return null;
  const r = await loadGuestReview(reservationId);
  if (!r) return null;
  if (r.own?.status === "rejected") return null; // the guest was told by e-mail
  if (r.own) {
    return (
      <ReviewThanks
        firstName={r.firstName}
        googleUrl={r.googleUrl}
        rebookHref={r.rebookHref}
        pending={r.own.status === "submitted"}
      />
    );
  }
  if (r.eligibility !== "ok") return null;
  return (
    <ReviewForm
      reservationId={reservationId}
      until={r.until}
      defaultName={r.displayName}
      firstName={r.firstName}
      propertyName={r.propertyName}
      googleUrl={r.googleUrl}
      rebookHref={r.rebookHref}
    />
  );
}
