import { buildIcal } from "@/core/ical/ical";
import { createClient } from "@/lib/supabase/server";

/**
 * Availability export of one unit for Booking.com, Airbnb and calendar apps (B2). The secret token is the only key;
 * events say only "busy". `?exclude=<channel id>` leaves out that channel's own events (no echo).
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!/^[0-9a-f]{36}$/.test(token)) return new Response("Not found", { status: 404 });
  const exclude = new URL(request.url).searchParams.get("exclude");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ical_export", {
    p_token: token,
    p_exclude_channel: exclude && /^[0-9a-f-]{36}$/.test(exclude) ? exclude : undefined,
  });
  if (error) return new Response("Error", { status: 500 });
  const events = (data ?? []).flatMap((e) => {
    const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(e.nights));
    return m
      ? [{ uid: `${e.uid}@booking-platform`, start: m[1]!, end: m[2]!, summary: "Busy" }]
      : [];
  });
  return new Response(buildIcal({ name: "Availability", events }), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
