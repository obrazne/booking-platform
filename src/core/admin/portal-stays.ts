import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PortalStay = {
  id: string;
  /** booking | airbnb | other (the channel's source). */
  portal: string;
  channelName: string;
  channelId: string;
  unitId: string;
  unitName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  label: string | null;
  url: string | null;
  code: string | null;
  phone4: string | null;
  /** An unresolved collision with a reservation or a block here (Z42). */
  conflict: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

/** "[2027-01-05,2027-01-08)" → the first night and the day of departure. */
export function parseNights(range: unknown): { checkIn: string; checkOut: string } | null {
  const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(range ?? ""));
  return m ? { checkIn: m[1]!, checkOut: m[2]! } : null;
}

/**
 * Stays from portals (Z58): the occupancy of the iCal channels of the client (Booking, Airbnb, other calendars) —
 * not reservations of the platform; nothing is written. RLS: the client's team.
 */
export async function loadPortalStays(tenantId: string, id?: string): Promise<PortalStay[]> {
  const supabase = await createClient();
  let q = supabase
    .from("occupancy")
    .select(
      "id, unit_id, nights, label, conflict, conflict_resolved_at, ical_channel_id, ical_details, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("kind", "ical")
    .not("ical_channel_id", "is", null)
    .limit(2000);
  if (id) q = q.eq("id", id);
  const [{ data: rows }, { data: channels }, { data: units }] = await Promise.all([
    q,
    supabase
      .from("ical_channels")
      .select("id, name, source, last_sync_at")
      .eq("tenant_id", tenantId),
    supabase.from("units").select("id, name, property:properties(name)").eq("tenant_id", tenantId),
  ]);
  return (rows ?? [])
    .map((r): PortalStay | null => {
      const nights = parseNights(r.nights);
      const channel = (channels ?? []).find((c) => c.id === r.ical_channel_id);
      if (!nights || !channel) return null;
      const unit = (units ?? []).find((u) => u.id === r.unit_id);
      const details = (r.ical_details ?? {}) as { url?: string; code?: string; phone4?: string };
      return {
        id: r.id,
        portal: channel.source ?? "other",
        channelName: channel.name,
        channelId: channel.id,
        unitId: r.unit_id,
        unitName: unit?.name ?? "—",
        propertyName: (unit?.property as { name?: string } | null)?.name ?? "",
        ...nights,
        label: r.label,
        url: details.url && /^https:\/\//.test(details.url) ? details.url : null,
        code: details.code ?? null,
        phone4: details.phone4 ?? null,
        conflict: r.conflict && !r.conflict_resolved_at,
        lastSyncAt: channel.last_sync_at,
        createdAt: r.created_at,
      };
    })
    .filter((s): s is PortalStay => s !== null)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}
