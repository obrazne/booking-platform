import "server-only";
import { diffDays } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { parseNights } from "./occupancy";

/** What a collision overlaps with: a reservation, an owner block, or a stay from another calendar. */
export type CollisionOverlap = {
  id: string;
  kind: "reservation" | "block" | "ical" | "hold";
  checkIn: string;
  checkOut: string;
  /** Nights both share. */
  nights: number;
  label: string | null;
  channel: string | null;
  reservation: { id: string; number: string; guestName: string; status: string } | null;
};

/** A collision (Z42): an iCal event kept non-blocking because the dates are taken (occupancy.conflict, A16). */
export type Collision = {
  id: string;
  unitId: string;
  unitLabel: string;
  checkIn: string;
  checkOut: string;
  label: string | null;
  channelId: string | null;
  channelName: string | null;
  source: string | null;
  detectedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  overlaps: CollisionOverlap[];
};

const SELECT = `id, unit_id, nights, label, ical_channel_id, conflict_detected_at, conflict_resolved_at,
  resolver:profiles!occupancy_conflict_resolved_by_fkey(full_name),
  channel:ical_channels(name, source),
  unit:units(name, property:properties(name, booking_mode))`;

/** Collisions of the tenant (RLS: the team), open first, each with what it overlaps. */
export async function loadCollisions(tenantId: string, id?: string): Promise<Collision[]> {
  const supabase = await createClient();
  let query = supabase
    .from("occupancy")
    .select(SELECT)
    .eq("tenant_id", tenantId)
    .eq("conflict", true)
    .order("nights");
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).flatMap((o) => {
    const nights = parseNights(o.nights);
    return nights ? [{ ...o, checkIn: nights[0], checkOut: nights[1] }] : [];
  });
  if (!rows.length) return [];

  // Blocking rows of the same units in the dates of the collisions — one query, matched below.
  const from = rows.map((r) => r.checkIn).sort()[0]!;
  const to = rows
    .map((r) => r.checkOut)
    .sort()
    .at(-1)!;
  const { data: blocking } = await supabase
    .from("occupancy")
    .select(
      "id, unit_id, nights, kind, label, channel:ical_channels(name), reservation:reservations(id, number, guest_name, status)",
    )
    .eq("tenant_id", tenantId)
    .eq("is_blocking", true)
    .in("unit_id", [...new Set(rows.map((r) => r.unit_id))])
    .overlaps("nights", `[${from},${to})`);
  const others = (blocking ?? []).flatMap((b) => {
    const n = parseNights(b.nights);
    return n ? [{ ...b, checkIn: n[0], checkOut: n[1] }] : [];
  });

  const list = rows.map((o): Collision => {
    const unit = o.unit;
    return {
      id: o.id,
      unitId: o.unit_id,
      unitLabel:
        unit?.property?.booking_mode === "units"
          ? `${unit.property.name} — ${unit.name}`
          : (unit?.property?.name ?? unit?.name ?? ""),
      checkIn: o.checkIn,
      checkOut: o.checkOut,
      label: o.label,
      channelId: o.ical_channel_id,
      channelName: o.channel?.name ?? null,
      source: o.channel?.source ?? null,
      detectedAt: o.conflict_detected_at,
      resolvedAt: o.conflict_resolved_at,
      resolvedBy: o.resolver?.full_name ?? null,
      overlaps: others
        .filter((b) => b.unit_id === o.unit_id && b.checkIn < o.checkOut && b.checkOut > o.checkIn)
        .map((b) => ({
          id: b.id,
          kind: b.kind as CollisionOverlap["kind"],
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          nights: diffDays(
            b.checkIn > o.checkIn ? b.checkIn : o.checkIn,
            b.checkOut < o.checkOut ? b.checkOut : o.checkOut,
          ),
          label: b.label,
          channel: b.channel?.name ?? null,
          reservation: b.reservation
            ? {
                id: b.reservation.id,
                number: b.reservation.number,
                guestName: b.reservation.guest_name,
                status: b.reservation.status,
              }
            : null,
        })),
    };
  });
  return list.sort(
    (a, b) =>
      Number(Boolean(a.resolvedAt)) - Number(Boolean(b.resolvedAt)) ||
      a.checkIn.localeCompare(b.checkIn),
  );
}

/** Open collisions for the menu badge and the sync line: how many, and the only one when there is one. */
export async function openCollisions(
  tenantId: string,
): Promise<{ open: number; any: boolean; onlyId: string | null }> {
  const supabase = await createClient();
  const [{ data: open }, { count: all }] = await Promise.all([
    supabase
      .from("occupancy")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("conflict", true)
      .is("conflict_resolved_at", null)
      .limit(2),
    supabase
      .from("occupancy")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("conflict", true),
  ]);
  const ids = (open ?? []).map((o) => o.id);
  const { count } =
    ids.length > 1
      ? await supabase
          .from("occupancy")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("conflict", true)
          .is("conflict_resolved_at", null)
      : { count: ids.length };
  return { open: count ?? 0, any: (all ?? 0) > 0, onlyId: ids.length === 1 ? ids[0]! : null };
}
