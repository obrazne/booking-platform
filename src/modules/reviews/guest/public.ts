import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PARTIAL_RATINGS } from "../model";

export type VerifiedReview = {
  id: string;
  name: string;
  stayMonth: string;
  rating: number;
  body: string;
  reply: string | null;
  featured: boolean;
};

export type VerifiedReviews = {
  count: number;
  average: number;
  parts: { key: (typeof PARTIAL_RATINGS)[number]; value: number }[];
  reviews: VerifiedReview[];
};

/**
 * Published verified reviews of a property with the average (Z38) — through the public functions of the database,
 * without personal data. Null when the client has no reviews yet (the page then keeps the manual testimonials).
 */
export async function loadVerifiedReviews(
  tenantId: string,
  propertyId: string,
): Promise<VerifiedReviews | null> {
  const supabase = await createClient();
  const [{ data: summary }, { data: rows }] = await Promise.all([
    supabase.rpc("review_summary", { p_tenant_id: tenantId, p_property_id: propertyId }),
    supabase.rpc("public_reviews", {
      p_tenant_id: tenantId,
      p_property_id: propertyId,
      p_limit: 60,
    }),
  ]);
  const s = summary?.[0];
  if (!s || !s.count) return null;
  const partValue: Record<string, number | null> = {
    cleanliness: s.cleanliness,
    location: s.location,
    communication: s.communication,
    value: s.value,
  };
  return {
    count: s.count,
    average: Number(s.average),
    parts: PARTIAL_RATINGS.flatMap((key) =>
      partValue[key] != null ? [{ key, value: Number(partValue[key]) }] : [],
    ),
    reviews: (rows ?? []).map((r) => ({
      id: r.id,
      name: r.display_name,
      stayMonth: r.stay_month,
      rating: r.rating,
      body: r.body,
      reply: r.owner_reply,
      featured: r.featured,
    })),
  };
}
