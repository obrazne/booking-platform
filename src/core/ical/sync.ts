import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseIcal } from "./ical";

const MAX_BYTES = 2_000_000;
const INTERVAL_MINUTES = 5;

/** Imports calendars of channels not synced in the last few minutes (A16: as often as reasonable). */
export async function syncDueChannels(
  limit = 10,
  onlyIds?: string[],
): Promise<{ synced: number; errors: number; conflicts: number }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - INTERVAL_MINUTES * 60_000).toISOString();
  let query = admin
    .from("ical_channels")
    .select("id, import_url")
    .eq("active", true)
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  query = onlyIds
    ? query.in("id", onlyIds)
    : query.or(`last_sync_at.is.null,last_sync_at.lt.${since}`);
  const { data: channels } = await query;
  const stats = { synced: 0, errors: 0, conflicts: 0 };
  for (const ch of channels ?? []) {
    try {
      const res = await fetch(ch.import_url, {
        headers: { "user-agent": "booking-platform-ical/1.0" },
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length > MAX_BYTES) throw new Error("Calendar too large");
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Not an iCalendar file");
      const events = parseIcal(text);
      const { data, error } = await admin.rpc("ical_apply", {
        p_channel_id: ch.id,
        p_events: events,
      });
      if (error) throw new Error(error.message);
      const conflicts = (data as { conflicts?: unknown[] } | null)?.conflicts?.length ?? 0;
      stats.synced += 1;
      stats.conflicts += conflicts;
    } catch (e) {
      stats.errors += 1;
      await admin.rpc("ical_mark_error", {
        p_channel_id: ch.id,
        p_error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return stats;
}
