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

/** Reviews of the client, newest first (RLS: the team of the client). */
export async function queryReviews(tenantId: string, status: ReviewStatus | null) {
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select(COLUMNS)
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (status) q = q.eq("status", status);
  const [{ data }, { data: all }, { data: summary }] = await Promise.all([
    q,
    supabase.from("reviews").select("status").eq("tenant_id", tenantId),
    supabase.rpc("review_summary", { p_tenant_id: tenantId }),
  ]);
  const counts: Record<string, number> = {};
  for (const r of all ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return { rows: data ?? [], counts, total: all?.length ?? 0, summary: summary?.[0] ?? null };
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
