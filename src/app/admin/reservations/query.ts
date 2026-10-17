import "server-only";
import { likePattern, pageRange, parseListParams, type ListParams } from "@/core/admin/list-params";
import { createClient } from "@/lib/supabase/server";

export const STATUSES = [
  "pending_payment",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const SOURCES = ["direct", "manual", "booking", "airbnb", "other"] as const;
export type ReservationStatus = (typeof STATUSES)[number];

export function reservationListParams(
  sp: Record<string, string | string[] | undefined>,
): ListParams & {
  from: string | null;
  to: string | null;
} {
  const p = parseListParams(sp, {
    sortable: ["created_at", "number", "total_cents"],
    defaultSort: "created_at",
    defaultDir: "desc",
    filters: { status: STATUSES, source: SOURCES },
  });
  const date = (v: string | string[] | undefined) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  return { ...p, from: date(sp.from), to: date(sp.to) };
}

const SELECT =
  "id, number, status, source, guest_name, guest_email, guest_phone, adults, children, infants, pets, total_cents, currency, created_at, payment_due_at, cancellation_requested_at, property:properties(name), items:reservation_items!inner(check_in, check_out, unit:units(name))";

/** Reservations of the tenant with filters on status, source, arrival date and text (RLS: staff only). */
export async function queryReservations(
  tenantId: string,
  p: ReturnType<typeof reservationListParams>,
  paged = true,
) {
  const supabase = await createClient();
  let q = supabase
    .from("reservations")
    .select(SELECT, { count: "exact" })
    .eq("tenant_id", tenantId)
    .order(p.sort, { ascending: p.dir === "asc" });
  if (p.filters.status) q = q.eq("status", p.filters.status);
  if (p.filters.source) q = q.eq("source", p.filters.source);
  if (p.from) q = q.gte("items.check_in", p.from);
  if (p.to) q = q.lte("items.check_in", p.to);
  if (p.q) {
    const pattern = likePattern(p.q);
    q = q.or(`number.ilike.${pattern},guest_name.ilike.${pattern},guest_email.ilike.${pattern}`);
  }
  if (paged) q = q.range(...pageRange(p));
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

/** One reservation with everything the side panel shows. */
export async function getReservationDetail(tenantId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      `*, property:properties(name, slug), items:reservation_items(check_in, check_out, unit:units(name)),
       lines:reservation_lines(kind, label, quantity, unit_amount_cents, amount_cents, sort),
       payments(status, amount_cents, variable_symbol, received_at),
       history:reservation_status_history(from_status, to_status, reason, changed_at, actor:profiles(email, full_name)),
       consents:reservation_consents(kind, granted, created_at),
       notes:reservation_notes(id, body, created_at, author:profiles(email, full_name))`,
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    // Settlements of the stay account (upsell) are shown in their own section.
    .eq("payments.purpose", "reservation")
    .maybeSingle();
  return data;
}

/** Count of reservations per state with the other filters applied (counts on the state pills). */
export async function statusCounts(
  tenantId: string,
  p: ReturnType<typeof reservationListParams>,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  let q = supabase
    .from("reservations")
    .select("status, items:reservation_items!inner(check_in)")
    .eq("tenant_id", tenantId);
  if (p.filters.source) q = q.eq("source", p.filters.source);
  if (p.from) q = q.gte("items.check_in", p.from);
  if (p.to) q = q.lte("items.check_in", p.to);
  if (p.q) {
    const pattern = likePattern(p.q);
    q = q.or(`number.ilike.${pattern},guest_name.ilike.${pattern},guest_email.ilike.${pattern}`);
  }
  const { data } = await q;
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}
