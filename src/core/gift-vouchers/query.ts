import "server-only";
import { likePattern, pageRange, parseListParams, type ListParams } from "@/core/admin/list-params";
import { createClient } from "@/lib/supabase/server";

export const GIFT_FILTERS = ["valid", "used", "expired", "cancelled"] as const;
type GiftFilter = (typeof GIFT_FILTERS)[number];

/** Ponuka › Poukazy (Z78): filter, search and sort from the URL — in the database (rule 7). */
export function giftVoucherListParams(
  sp: Record<string, string | string[] | undefined>,
): ListParams {
  return parseListParams(sp, {
    sortable: ["created_at", "amount_cents", "valid_until"],
    defaultSort: "created_at",
    defaultDir: "desc",
    filters: { filter: GIFT_FILTERS },
  });
}

const COLUMNS =
  "id, code, amount_cents, balance_cents, currency, recipient_name, valid_until, note, status, created_at";

/** The state filter in the database: valid (also partly used), used up, expired, cancelled. */
type Filterable = {
  eq: (c: string, v: unknown) => Filterable;
  gt: (c: string, v: unknown) => Filterable;
  lt: (c: string, v: unknown) => Filterable;
  or: (f: string) => Filterable;
};

function byState<Q>(q: Q, filter: GiftFilter | undefined, today: string): Q {
  const query = q as unknown as Filterable;
  switch (filter) {
    case "valid":
      return query
        .eq("status", "active")
        .gt("balance_cents", 0)
        .or(`valid_until.is.null,valid_until.gte.${today}`) as unknown as Q;
    case "used":
      return query.eq("status", "active").eq("balance_cents", 0) as unknown as Q;
    case "expired":
      return query
        .eq("status", "active")
        .gt("balance_cents", 0)
        .lt("valid_until", today) as unknown as Q;
    case "cancelled":
      return query.eq("status", "cancelled") as unknown as Q;
    default:
      return q;
  }
}

export async function queryGiftVouchers(tenantId: string, p: ListParams, today: string) {
  const supabase = await createClient();
  const [from, to] = pageRange(p);
  let query = supabase
    .from("gift_vouchers")
    .select(COLUMNS, { count: "exact" })
    .eq("tenant_id", tenantId);
  query = byState(query, p.filters.filter as GiftFilter | undefined, today);
  if (p.q) {
    const like = likePattern(p.q);
    query = query.or(`code.ilike.${like},recipient_name.ilike.${like}`);
  }
  const { data, count } = await query
    .order(p.sort, { ascending: p.dir === "asc", nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function giftVoucherCounts(tenantId: string, today: string) {
  const supabase = await createClient();
  const count = async (filter?: GiftFilter) => {
    const q = byState(
      supabase
        .from("gift_vouchers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      filter,
      today,
    );
    return (await q).count ?? 0;
  };
  const [all, valid, used, expired, cancelled] = await Promise.all([
    count(),
    count("valid"),
    count("used"),
    count("expired"),
    count("cancelled"),
  ]);
  return { all, valid, used, expired, cancelled };
}

/** One voucher with where it was used (reservations), for the panel. */
export async function loadGiftVoucher(tenantId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gift_vouchers")
    .select(
      `${COLUMNS}, uses:gift_voucher_uses(id, amount_cents, created_at, returned_at, reservation:reservations(id, number, guest_name))`,
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  return data;
}
