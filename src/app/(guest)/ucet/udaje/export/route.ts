import { requireGuest } from "@/core/guest/zone";
import { zip } from "@/lib/zip";

const mask = (v: string | null) => (v ? `••••${v.slice(-2)}` : null);

/**
 * "Stiahnuť moje údaje" (Z43): a ZIP with the guest's own data at this client as JSON — profile, stays with their
 * price lines and payments, consents, reviews, orders and check-in persons. Everything is read with the guest's
 * rights (RLS); document numbers and dates of birth from the check-in are masked.
 */
export async function GET() {
  const { tenant, supabase, guest } = await requireGuest();
  const [
    { data: profile },
    { data: stays },
    { data: consents },
    { data: reviews },
    { data: orders },
    { data: persons },
  ] = await Promise.all([
    supabase
      .from("guests")
      .select(
        "email, name, phone, country, marketing_consent, marketing_consent_at, created_at, deletion_requested_at",
      )
      .eq("id", guest.id)
      .single(),
    supabase
      .from("reservations")
      .select(
        "number, status, created_at, adults, children, infants, pets, currency, total_cents, guest_name, guest_email, guest_phone, items:reservation_items(check_in, check_out), lines:reservation_lines(label, quantity, unit_amount_cents, amount_cents), payments(status, amount_cents, received_at)",
      )
      .eq("tenant_id", tenant.id)
      .eq("guest_id", guest.id)
      .order("created_at"),
    supabase.from("guest_consent_events").select("*").eq("guest_id", guest.id).order("created_at"),
    supabase
      .from("reviews")
      .select(
        "rating, rating_cleanliness, rating_location, rating_communication, rating_value, body, display_name, status, submitted_at, published_at",
      )
      .eq("guest_id", guest.id),
    supabase
      .from("reservation_orders")
      .select(
        "label, items, amount_cents, currency, service_date, payment_method, status, created_at, reservation:reservations(number)",
      )
      .eq("tenant_id", tenant.id),
    supabase
      .from("checkin_guests")
      .select(
        "first_name, last_name, is_citizen, nationality, document_type, document_number, birth_date, address, reservation:reservations(number)",
      )
      .eq("tenant_id", tenant.id),
  ]);
  // Messages with the owner (Z47) — the guest's own conversations (RLS).
  const { data: messages } = await supabase
    .from("messages")
    .select("sender, body, created_at, reservation:reservations(number)")
    .eq("tenant_id", tenant.id)
    .order("created_at");
  const data = {
    exported_at: new Date().toISOString(),
    accommodation: tenant.name,
    profile,
    stays: stays ?? [],
    consents: consents ?? [],
    reviews: reviews ?? [],
    orders: orders ?? [],
    messages: (messages ?? []).map((m) => ({
      from: m.sender === "guest" ? "guest" : "accommodation",
      body: m.body,
      created_at: m.created_at,
      reservation: m.reservation?.number ?? null,
    })),
    checkin_persons: (persons ?? []).map((p) => ({
      ...p,
      document_number: mask(p.document_number),
      birth_date: p.birth_date ? `${p.birth_date.slice(0, 4)}-••-••` : null,
    })),
  };
  const readme = [
    `Vaše údaje u ${tenant.name}`,
    "",
    "udaje.json obsahuje váš profil, pobyty (rozpis ceny a platby), súhlasy, recenzie, objednávky, správy a osoby z online check-inu.",
    "Čísla dokladov a dátumy narodenia sú z bezpečnostných dôvodov skryté — celé ich vidí len ubytovateľ.",
  ].join("\n");
  const body = zip([
    { name: "udaje.json", data: JSON.stringify(data, null, 2) },
    { name: "precitajte-si.txt", data: readme },
  ]);
  return new Response(Buffer.from(body), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="moje-udaje-${tenant.slug}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
