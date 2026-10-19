import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";

/**
 * "Údaje hosťa" (Z68): everything the client keeps about one guest — contact, consents with their history, stays
 * (with lines and orders) and messages — as one JSON file for the guest's request of access (GDPR art. 15).
 * The team's note is included (the guest has the right to it). Written into the history of changes.
 */
export async function GET(_: Request, ctx: RouteContext<"/admin/guests/[id]/data">) {
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role))
    return new Response(null, { status: 403 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: guest } = await supabase
    .from("guests")
    .select(
      "email, name, phone, country, language, address, address_source, address_updated_at, source, marketing_consent, marketing_consent_at, created_at, updated_at",
    )
    .eq("id", id)
    .eq("tenant_id", active.tenantId)
    .maybeSingle();
  if (!guest) return new Response(null, { status: 404 });
  const [{ data: consents }, { data: reservations }, { data: note }] = await Promise.all([
    supabase
      .from("guest_consent_events")
      .select("kind, granted, source, reason, created_at")
      .eq("guest_id", id)
      .order("created_at"),
    supabase
      .from("reservations")
      .select(
        "id, number, status, source, created_at, guest_name, guest_email, guest_phone, guest_country, guest_note, adults, children, infants, pets, total_cents, currency, marketing_consent, items:reservation_items(check_in, check_out), lines:reservation_lines(kind, label, amount_cents), orders:reservation_orders(label, amount_cents, status, created_at), messages(sender, body, created_at)",
      )
      .eq("guest_id", id)
      .order("created_at"),
    supabase.from("guest_notes").select("body, updated_at").eq("guest_id", id).maybeSingle(),
  ]);
  await supabase.rpc("guest_export_log", {
    p_tenant_id: active.tenantId,
    p_scope: "guest",
    p_count: 1,
    p_guest_id: id,
  });
  const body = {
    exported_at: new Date().toISOString(),
    accommodation: active.tenantName,
    guest,
    consents: consents ?? [],
    stays: reservations ?? [],
    team_note: note ?? null,
  };
  const slug = (guest.name || guest.email)
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase();
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="udaje-hosta-${slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
