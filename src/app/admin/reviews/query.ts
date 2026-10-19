import "server-only";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_STATUSES, type ReviewStatus } from "@/modules/reviews/model";

export function reviewStatusParam(v: unknown): ReviewStatus | null {
  return typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v)
    ? (v as ReviewStatus)
    : null;
}

const COLUMNS = `id, status, rating, rating_cleanliness, rating_location, rating_communication, rating_value, body,
  display_name, stay_month, locale, reject_reason, owner_reply, owner_reply_at, featured, submitted_at, published_at,
  rejected_at, property:properties(id, name), reservation:reservations(id, number)`;

/**
 * One page of the client's reviews, newest first (rule 7: range + count in the database; RLS: the team of the client).
 * The counts of the status pills are head counts — no review is loaded only to be counted.
 */
export async function queryReviews(
  tenantId: string,
  status: ReviewStatus | null,
  range: { from: number; to: number } = { from: 0, to: 19 },
) {
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select(COLUMNS, { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false })
    .order("id")
    .range(range.from, range.to);
  if (status) q = q.eq("status", status);
  const count = (s?: ReviewStatus) => {
    let c = supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (s) c = c.eq("status", s);
    return c;
  };
  const [{ data, count: found }, all, { data: summary }, ...per] = await Promise.all([
    q,
    count(),
    supabase.rpc("review_summary", { p_tenant_id: tenantId }),
    ...REVIEW_STATUSES.map((s) => count(s)),
  ]);
  const counts: Record<string, number> = Object.fromEntries(
    REVIEW_STATUSES.map((s, i) => [s, per[i]?.count ?? 0]),
  );
  return {
    rows: data ?? [],
    found: found ?? 0,
    counts,
    total: all.count ?? 0,
    summary: summary?.[0] ?? null,
  };
}

export async function getReview(tenantId: string, reviewId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", reviewId)
    .maybeSingle();
  return data;
}

export type ReviewRow = NonNullable<Awaited<ReturnType<typeof getReview>>>;
