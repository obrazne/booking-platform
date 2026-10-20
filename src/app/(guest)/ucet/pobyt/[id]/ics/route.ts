import { icsFile } from "@/core/guest/calendar-links";
import { stayEvent } from "@/core/guest/stay-calendar";
import { requireGuest } from "@/core/guest/zone";
import { requestHost } from "@/core/tenant/current";

/** "Apple / iný kalendár" for a stay in the account (Z72): only a stay of the signed-in guest (RLS). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const { supabase, guest } = await requireGuest();
  const { data: r } = await supabase
    .from("reservations")
    .select("id, number")
    .eq("id", id)
    .eq("guest_id", guest.id)
    .maybeSingle();
  if (!r) return new Response("Not found", { status: 404 });
  const event = await stayEvent(r.id, `https://${await requestHost()}/ucet/pobyt/${r.id}`);
  if (!event) return new Response("Not found", { status: 404 });
  return new Response(icsFile(event, `${r.id}@booking-platform`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pobyt-${r.number}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
