import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv } from "./csv";
import { maskCheckinGuest } from "./mask";
import type { ZipEntry } from "./zip";

/**
 * Export of one client's data (Z52, A8): what the client has in the platform, by area — each table as JSON and CSV,
 * the files of the documents, a README. Check-in persons with the sensitive fields masked. Read with the server key
 * (the caller checks the platform admin). Technical tables (audit, history, notifications, e-mail queue, devices,
 * attempts) are not part of it.
 */
const AREAS: Record<string, readonly string[]> = {
  rezervacie: [
    "reservations",
    "reservation_items",
    "reservation_lines",
    "reservation_notes",
    "reservation_status_history",
    "reservation_consents",
    "occupancy",
  ],
  hostia: ["guests", "guest_consent_events", "guest_consent_requests", "guest_notes"],
  platby: ["payments", "gift_vouchers", "gift_voucher_uses"],
  objednavky: ["reservation_orders"],
  spravy: ["messages", "message_threads", "message_overrides", "message_rules", "quick_replies"],
  recenzie: ["reviews", "testimonials"],
  checkin: ["checkins", "checkin_guests"],
  dokumenty: ["documents"],
  ponuka: [
    "properties",
    "units",
    "unit_components",
    "photos",
    "property_places",
    "property_sections",
    "property_terms",
    "property_private",
    "services",
    "seasons",
    "season_ranges",
    "rates",
    "rate_band_prices",
    "fees",
    "discounts",
    "age_bands",
    "terms",
  ],
  nastavenia: [
    "tenant_settings",
    "tenant_domains",
    "tenant_modules",
    "tenant_themes",
    "ical_channels",
  ],
};

async function allRows(table: string, tenantId: string): Promise<Record<string, unknown>[]> {
  const db = createAdminClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      // Table names come from the fixed list above.
      .from(table as "reservations")
      .select("*")
      .eq("tenant_id", tenantId)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function buildTenantExport(tenantId: string): Promise<{
  entries: ZipEntry[];
  tenant: { name: string; slug: string };
  counts: Record<string, number>;
}> {
  const db = createAdminClient();
  const { data: tenant, error } = await db
    .from("tenants")
    .select("id, name, slug, country, currency, timezone, status, created_at")
    .eq("id", tenantId)
    .single();
  if (error || !tenant) throw new Error("tenant not found");

  const entries: ZipEntry[] = [
    { name: "nastavenia/tenant.json", data: JSON.stringify(tenant, null, 2) },
  ];
  const counts: Record<string, number> = {};
  for (const [area, tables] of Object.entries(AREAS)) {
    for (const table of tables) {
      let rows = await allRows(table, tenantId);
      if (table === "checkin_guests") rows = rows.map(maskCheckinGuest);
      // Z68: the hash of a one-time link is no data of the client.
      if (table === "guest_consent_requests")
        rows = rows.map((r) =>
          Object.fromEntries(Object.entries(r).filter(([k]) => k !== "token_hash")),
        );
      counts[table] = rows.length;
      entries.push(
        { name: `${area}/${table}.json`, data: JSON.stringify(rows, null, 2) },
        { name: `${area}/${table}.csv`, data: toCsv(rows) },
      );
    }
  }

  // The files of the documents (guest-documents bucket).
  const { data: docs } = await db
    .from("documents")
    .select("id, storage_path")
    .eq("tenant_id", tenantId);
  let files = 0;
  for (const d of docs ?? []) {
    const { data: blob } = await db.storage.from("guest-documents").download(d.storage_path);
    if (!blob) continue;
    const name = d.storage_path.split("/").pop() ?? d.id;
    entries.push({
      name: `dokumenty/subory/${d.id}-${name}`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
    files++;
  }
  counts.document_files = files;

  const readme = [
    `Export dát klienta ${tenant.name} (${tenant.slug}) — ${new Date().toISOString()}`,
    "",
    "Každá tabuľka je v dvoch formátoch: .json (presne) a .csv (oddeľovač ;, kódovanie UTF-8 — otvorí Excel).",
    "Priečinky: rezervacie, hostia, platby, objednavky, spravy, recenzie, checkin, dokumenty (aj súbory), ponuka, nastavenia.",
    "Check-in: číslo dokladu, dátum narodenia a adresa osôb sú maskované (citlivé údaje sa z platformy nevydávajú).",
    "Fotky objektov nie sú súčasťou exportu (sú na stránke klienta); ich zoznam je v ponuka/photos.",
    "",
    "Počty riadkov:",
    ...Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`),
    "",
  ].join("\n");
  entries.unshift({ name: "README.txt", data: readme });
  return { entries, tenant: { name: tenant.name, slug: tenant.slug }, counts };
}
