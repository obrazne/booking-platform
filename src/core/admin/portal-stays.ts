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

const SELECT =
  "id, unit_id, nights, label, conflict, conflict_resolved_at, ical_channel_id, ical_details, created_at";

type Row = {
  id: string;
  unit_id: string;
  nights: unknown;
  label: string | null;
  conflict: boolean;
  conflict_resolved_at: string | null;
  ical_channel_id: string | null;
  ical_details: unknown;
  created_at: string;
};
type Channel = { id: string; name: string; source: string | null; last_sync_at: string | null };
type Unit = { id: string; name: string; property: unknown };

async function lookups(tenantId: string) {
  const supabase = await createClient();
  const [{ data: channels }, { data: units }] = await Promise.all([
    supabase
      .from("ical_channels")
      .select("id, name, source, last_sync_at")
      .eq("tenant_id", tenantId),
    supabase.from("units").select("id, name, property:properties(name)").eq("tenant_id", tenantId),
  ]);
  return { channels: (channels ?? []) as Channel[], units: (units ?? []) as Unit[] };
}

function toStay(r: Row, channels: Channel[], units: Unit[]): PortalStay | null {
  const nights = parseNights(r.nights);
  const channel = channels.find((c) => c.id === r.ical_channel_id);
  if (!nights || !channel) return null;
  const unit = units.find((u) => u.id === r.unit_id);
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
}

/** The day before `today` (YYYY-MM-DD) — "past" = departure before today = nights strictly left of [yesterday, today). */
function yesterdayOf(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Stays from portals (Z58): the occupancy of the iCal channels of the client (Booking, Airbnb, other calendars) —
 * not reservations of the platform; nothing is written. RLS: the client's team. All of them (arrivals, the panel);
 * the list page uses `queryPortalStays` (one page from the database).
 */
export async function loadPortalStays(tenantId: string, id?: string): Promise<PortalStay[]> {
  const supabase = await createClient();
  let q = supabase
    .from("occupancy")
    .select(SELECT)
    .eq("tenant_id", tenantId)
    .eq("kind", "ical")
    .not("ical_channel_id", "is", null)
    .limit(2000);
  if (id) q = q.eq("id", id);
  const [{ data: rows }, { channels, units }] = await Promise.all([q, lookups(tenantId)]);
  return ((rows ?? []) as Row[])
    .map((r) => toStay(r, channels, units))
    .filter((s): s is PortalStay => s !== null);
}

/**
 * One page of stays from portals (rule 7): coming (departure today or later, nearest first) or past (newest first),
 * optionally one portal — filters, order and paging in SQL; counts of the filter pills as head counts.
 */
export async function queryPortalStays(
  tenantId: string,
  o: { when: "future" | "past"; portal: string; today: string; from: number; to: number },
) {
  const supabase = await createClient();
  const { channels, units } = await lookups(tenantId);
  const past = `[${yesterdayOf(o.today)},${o.today})`;
  const channelIds = (portal: string) =>
    channels.filter((c) => (c.source ?? "other") === portal).map((c) => c.id);
  const base = (head = false) =>
    supabase
      .from("occupancy")
      .select(SELECT, head ? { count: "exact", head: true } : { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("kind", "ical")
      .not("ical_channel_id", "is", null);
  const inWhen = <Q extends ReturnType<typeof base>>(q: Q, when: "future" | "past") =>
    (when === "past" ? q.filter("nights", "sl", past) : q.not("nights", "sl", past)) as Q;
  const inPortal = <Q extends ReturnType<typeof base>>(q: Q, portal: string) =>
    (portal ? q.in("ical_channel_id", channelIds(portal)) : q) as Q;

  const page = inPortal(inWhen(base(), o.when), o.portal)
    .order("nights", { ascending: o.when === "future" })
    .order("id")
    .range(o.from, o.to);
  const portals = ["booking", "airbnb", "other"].filter((p) => channelIds(p).length > 0);
  const [{ data, count }, future, pastCount, ...perPortal] = await Promise.all([
    page,
    inWhen(base(true), "future"),
    inWhen(base(true), "past"),
    ...portals.map((p) => inPortal(inWhen(base(true), o.when), p)),
  ]);
  return {
    stays: ((data ?? []) as Row[])
      .map((r) => toStay(r, channels, units))
      .filter((s): s is PortalStay => s !== null),
    total: count ?? 0,
    counts: {
      future: future.count ?? 0,
      past: pastCount.count ?? 0,
      portals: Object.fromEntries(portals.map((p, i) => [p, perPortal[i]?.count ?? 0])),
    },
  };
}
