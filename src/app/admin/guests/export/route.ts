import { getTranslations } from "next-intl/server";
import { allGuests } from "@/core/guests/query";
import { guestsCsv } from "@/core/guests/csv";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";

/**
 * Export of Hostia (Z68): `?scope=consent` (newsletter: only with the consent, with its date and source) or
 * `?scope=all` (own records). Written into the history of changes (who, which, how many).
 */
export async function GET(request: Request) {
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role))
    return new Response(null, { status: 403 });
  const scope = new URL(request.url).searchParams.get("scope") === "consent" ? "consent" : "all";
  const supabase = await createClient();
  const [rows, { data: extra }, { data: events }, t, tc] = await Promise.all([
    allGuests(active.tenantId, scope === "consent" ? "consent" : ""),
    supabase
      .from("guests")
      .select("email, language, marketing_consent_at")
      .eq("tenant_id", active.tenantId),
    supabase
      .from("guest_consent_events")
      .select("granted, source, created_at, guest:guests!inner(email)")
      .eq("tenant_id", active.tenantId)
      .eq("granted", true)
      .order("created_at", { ascending: true }),
    getTranslations("guests.csv"),
    getTranslations("guests.card.sources"),
  ]);
  const byEmail = new Map((extra ?? []).map((g) => [g.email, g]));
  // The source of the consent: the last time it was given; without an event it was given at a reservation.
  const consents = new Map<string, { at: string | null; source: string }>();
  for (const g of extra ?? [])
    if (g.marketing_consent_at)
      consents.set(g.email, { at: g.marketing_consent_at, source: "booking" });
  for (const e of events ?? []) consents.set(e.guest.email, { at: e.created_at, source: e.source });
  const csv = guestsCsv(
    scope,
    rows.map((r) => ({ ...r, language: byEmail.get(r.email)?.language ?? null })),
    consents,
    (k) => t(k as "email"),
    (k) => (tc.has(k as "owner") ? tc(k as "owner") : k),
  );
  const count = scope === "consent" ? rows.filter((r) => r.consent).length : rows.length;
  await supabase.rpc("guest_export_log", {
    p_tenant_id: active.tenantId,
    p_scope: scope,
    p_count: count,
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hostia-${scope === "consent" ? "so-suhlasom" : "vsetci"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
