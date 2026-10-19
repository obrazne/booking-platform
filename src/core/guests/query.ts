import "server-only";
import { parseListParams, type ListParams } from "@/core/admin/list-params";
import { createClient } from "@/lib/supabase/server";

export const GUEST_FILTERS = ["returning", "consent", "upcoming"] as const;
/**
 * Rezervácie › Hostia (Z68): filter, search and sort from the URL — done in the database (rule 7); the page and its size
 * come from `readPaging` (the common paging, Z63).
 */
export function guestListParams(sp: Record<string, string | string[] | undefined>): ListParams {
  return parseListParams(sp, {
    sortable: ["name", "stays", "last_stay", "spent"],
    defaultSort: "last_stay",
    defaultDir: "desc",
    filters: { filter: GUEST_FILTERS },
  });
}

export type GuestRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  consent: boolean;
  source: string;
  stays: number;
  lastStay: string | null;
  nextStay: string | null;
  spentCents: number;
};

/** ILIKE inside the database function: % and _ are letters here. */
function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function queryGuests(
  tenantId: string,
  p: ListParams,
  paged = true,
): Promise<{ rows: GuestRow[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guest_list", {
    p_tenant_id: tenantId,
    p_filter: p.filters.filter ?? "",
    p_q: escapeLike(p.q),
    p_sort: p.sort,
    p_dir: p.dir,
    p_offset: paged ? (p.page - 1) * p.pageSize : 0,
    p_limit: paged ? p.pageSize : 100,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    country: r.country,
    consent: r.marketing_consent,
    source: r.source,
    stays: r.stays,
    lastStay: r.last_stay,
    nextStay: r.next_stay,
    spentCents: Number(r.spent_cents),
  }));
  return { rows, total: Number(data?.[0]?.total_count ?? 0) };
}

/** All guests of a filter for the export (the database pages by 100). */
export async function allGuests(tenantId: string, filter: "" | "consent"): Promise<GuestRow[]> {
  const out: GuestRow[] = [];
  for (let page = 1; ; page++) {
    const p: ListParams = {
      q: "",
      page,
      pageSize: 100,
      sort: "name",
      dir: "asc",
      filters: filter ? { filter } : {},
    };
    const { rows } = await queryGuests(tenantId, p);
    out.push(...rows);
    if (rows.length < 100) return out;
  }
}

export async function guestCounts(tenantId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("guest_list_counts", { p_tenant_id: tenantId });
  const c = data?.[0];
  return {
    all: c?.all_guests ?? 0,
    returning: c?.returning_guests ?? 0,
    consent: c?.consent ?? 0,
    upcoming: c?.upcoming ?? 0,
  };
}

/** Everything the card of a guest shows: contact, consents with their history, stays, the team's note. */
export async function loadGuestCard(id: string) {
  const supabase = await createClient();
  const { data: guest } = await supabase
    .from("guests")
    .select(
      "id, tenant_id, email, name, phone, country, language, address, address_source, address_updated_at, source, marketing_consent, marketing_consent_at, consent_requested_at, created_at, user_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!guest) return null;
  const [{ data: events }, { data: reservations }, { data: note }, { data: block }] =
    await Promise.all([
      supabase
        .from("guest_consent_events")
        .select("granted, source, reason, created_at")
        .eq("guest_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reservations")
        .select(
          "id, number, status, total_cents, currency, adults, children, marketing_consent, created_at, items:reservation_items(check_in, check_out)",
        )
        .eq("guest_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("guest_notes").select("body").eq("guest_id", id).maybeSingle(),
      supabase.rpc("guest_consent_request_block", { p_guest_id: id }),
    ]);
  const stays = (reservations ?? [])
    .map((r) => {
      const items = [...(r.items ?? [])].sort((a, b) => a.check_in.localeCompare(b.check_in));
      return {
        id: r.id,
        number: r.number,
        status: r.status,
        totalCents: r.total_cents,
        currency: r.currency,
        guests: r.adults + r.children,
        checkIn: items[0]?.check_in ?? null,
        checkOut: items.at(-1)?.check_out ?? null,
        consentAtBooking: r.marketing_consent,
      };
    })
    .sort((a, b) => (b.checkIn ?? "").localeCompare(a.checkIn ?? ""));
  return {
    guest,
    events: events ?? [],
    stays,
    note: note?.body ?? "",
    requestBlock: (block as string | null) ?? null,
  };
}

export type GuestCard = NonNullable<Awaited<ReturnType<typeof loadGuestCard>>>;
