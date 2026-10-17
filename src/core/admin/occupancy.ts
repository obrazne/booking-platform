import "server-only";
import { addDays, diffDays } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { occupancyOfReservation, type OccupancyKind } from "./status";

/** One stay, portal booking or block in the calendar, as nights [checkIn, checkOut). */
export type OccupancyEvent = {
  id: string;
  unitId: string;
  kind: OccupancyKind;
  checkIn: string;
  checkOut: string;
  label: string | null;
  conflict: boolean;
  reservation: {
    id: string;
    number: string;
    guestName: string;
    status: string;
    source: string;
    adults: number;
    children: number;
    totalCents: number;
    currency: string;
    paymentDueAt: string | null;
  } | null;
  /** Portal of an iCal event (booking / airbnb / other). */
  portal: string | null;
};

export function parseNights(range: unknown): [string, string] | null {
  const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(range));
  return m ? [m[1]!, m[2]!] : null;
}

/**
 * Occupancy of the tenant overlapping [from, to): reservations, portal events (iCal) and owner blocks.
 * Holds of guests filling the cart and released rows are left out. RLS: staff only.
 */
export async function loadOccupancy(
  tenantId: string,
  from: string,
  to: string,
): Promise<OccupancyEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occupancy")
    .select(
      `id, unit_id, nights, kind, label, conflict, is_blocking,
       channel:ical_channels(source, name),
       reservation:reservations(id, number, guest_name, status, source, adults, children, total_cents, currency, payment_due_at)`,
    )
    .eq("tenant_id", tenantId)
    .in("kind", ["reservation", "ical", "block"])
    .overlaps("nights", `[${from},${to})`);
  if (error) throw error;
  return (data ?? []).flatMap((o) => {
    if (!o.is_blocking && !o.conflict) return [];
    const nights = parseNights(o.nights);
    if (!nights) return [];
    const r = o.reservation;
    if (o.kind === "reservation" && (!r || r.status === "cancelled")) return [];
    const kind: OccupancyKind =
      o.kind === "block"
        ? "block"
        : o.kind === "ical"
          ? "portal"
          : occupancyOfReservation(r!.status, r!.source);
    return [
      {
        id: o.id,
        unitId: o.unit_id,
        kind,
        checkIn: nights[0],
        checkOut: nights[1],
        label: o.label,
        conflict: o.conflict,
        portal: o.kind === "ical" ? (o.channel?.source ?? "other") : null,
        reservation: r
          ? {
              id: r.id,
              number: r.number,
              guestName: r.guest_name,
              status: r.status,
              source: r.source,
              adults: r.adults,
              children: r.children,
              totalCents: r.total_cents,
              currency: r.currency,
              paymentDueAt: r.payment_due_at,
            }
          : null,
      },
    ];
  });
}

/** Kind occupying each night of [from, to) (any unit; reservations win over portals and blocks). */
export function kindsByNight(
  events: OccupancyEvent[],
  from: string,
  to: string,
): Map<string, OccupancyKind> {
  const rank: Record<OccupancyKind, number> = { direct: 4, pending: 3, portal: 2, block: 1 };
  const out = new Map<string, OccupancyKind>();
  for (const e of events) {
    const start = e.checkIn < from ? from : e.checkIn;
    const end = e.checkOut > to ? to : e.checkOut;
    for (let i = 0; i < diffDays(start, end); i++) {
      const d = addDays(start, i);
      const cur = out.get(d);
      if (!cur || rank[e.kind] > rank[cur]) out.set(d, e.kind);
    }
  }
  return out;
}

/** State of the Booking / Airbnb synchronisation for the "synchronizované pred X min" line. */
export type SyncState = {
  channels: number;
  /** Minutes since the last synchronisation (null = never). */
  minutesAgo: number | null;
  problem: "conflict" | "error" | null;
};

export async function loadSyncState(tenantId: string): Promise<SyncState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ical_channels")
    .select("last_sync_at, last_status, active")
    .eq("tenant_id", tenantId)
    .eq("active", true);
  const rows = data ?? [];
  const last = rows
    .map((r) => r.last_sync_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const problem = rows.some((r) => r.last_status === "conflict")
    ? "conflict"
    : rows.some((r) => r.last_status === "error")
      ? "error"
      : null;
  const minutesAgo = last
    ? Math.max(0, Math.round((Date.now() - new Date(last).getTime()) / 60_000))
    : null;
  return { channels: rows.length, minutesAgo, problem };
}
