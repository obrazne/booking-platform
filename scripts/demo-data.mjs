// Demo data on STAGING for Chalet STRÖMY (Z21) — so Martin can click through everything.
//
//   node scripts/demo-data.mjs          creates what is missing (safe to run again)
//   node scripts/demo-data.mjs --reset  removes the demo records and creates them again
//
// Reservations go through the same database function as a real booking (create_reservation: atomic term, frozen
// price lines, status history, consents), with the price from the same calculation the guest page uses.
// Demo records are marked: guest e-mails on the reserved domain stromy-demo.invalid (never sent), "DEMO" in the
// guest note and in labels. Only reservation (b) has a deliverable address so Martin can try the guest zone —
// staging redirects every e-mail to EMAIL_REDIRECT_TO. E-mails queued by the demo are marked skipped, not sent.
import { createClient } from "@supabase/supabase-js";
import { createJiti } from "jiti";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");
if (/prod/i.test(url) || process.env.VERCEL_ENV === "production")
  throw new Error("Demo data are for staging only");

const db = createClient(url, key, { auth: { persistSession: false } });
const src = fileURLToPath(new URL("../src", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": src } });
const { calculatePrice } = await jiti.import("@/core/pricing/calculate");
const { toDiscounts, toFees, toSeasons, toServices } = await jiti.import(
  "@/core/booking/pricing-input",
);
const { priceContributorsFor } = await jiti.import("@/modules/price-contributors");
const sk = JSON.parse(
  readFileSync(new URL("../src/i18n/messages/sk.json", import.meta.url), "utf8"),
);

const TENANT = "a0000000-0000-4000-8000-000000000002";
const PROPERTY = "b0000000-0000-4000-8000-000000000100";
const UNIT = "c0000000-0000-4000-8000-000000000100";
const DEMO_DOMAIN = "stromy-demo.invalid";
/** Deliverable only through the staging redirect; the guest-zone login code ends up in Martin's inbox. */
const GUEST_ZONE_EMAIL = "demo-host@obrazne.sk";
const MARTIN = "info@obrazne.sk";
const NOTE = "DEMO — ukážková rezervácia (scripts/demo-data.mjs)";
const reset = process.argv.includes("--reset");
const runId = Date.now().toString(36);
const GUESTS = [
  "Peter Novák",
  "Lucia Kováčová",
  "Martin Baláž",
  "Zuzana Hudecová",
  "Tomáš Mráz",
  "Eva Krajčírová",
  "Jakub Šimko",
  "Andrea Polakovičová",
  "Michal Varga",
  "Simona Tóthová",
  "Marek Benko",
  "Veronika Lukáčová",
  "Juraj Oravec",
  "Katarína Pavlíková",
  "Róbert Kollár",
  "Ivana Hrušovská",
  "Filip Gajdoš",
  "Barbora Kubišová",
];
/** Stays per month, January–December: winter and summer stronger, spring and autumn weak. */
// Reviews of past stays in every state (Z34).
const REVIEWS = [
  {
    hours: 20,
    status: "submitted",
    rating: 5,
    parts: [5, 5, 5, 4],
    body: "Nádherné miesto, ticho a výhľad na hory. Sauna po túre bola presne to, čo sme potrebovali.",
  },
  {
    hours: 52,
    status: "submitted",
    rating: 4,
    parts: [4, 5, 4, 4],
    body: "Chata je krásna a čistá. Len príjazdová cesta je v zime náročnejšia, odporúčame zimné pneumatiky.",
  },
  {
    hours: 24 * 9,
    status: "published",
    rating: 5,
    parts: [5, 5, 5, 5],
    featured: true,
    reply: "Ďakujeme, tešíme sa na vás znova!",
    body: "Najlepší víkend tohto roka. Všetko pripravené, krb, drevo, kuchyňa vybavená do posledného detailu.",
  },
  {
    hours: 24 * 40,
    status: "published",
    rating: 5,
    parts: [5, 4, 5, 5],
    body: "Ideálne pre rodinu s deťmi. Deti si užívali záhradu, my večery na terase.",
  },
  {
    hours: 24 * 75,
    status: "published",
    rating: 4,
    parts: [4, 5, 5, 3],
    reply: "Ďakujeme za tip, na jar pribudne druhá rýchlovarná kanvica.",
    body: "Veľmi príjemný pobyt, komunikácia rýchla. Pre šesť ľudí by sa zišlo viac riadu.",
  },
  { hours: 24 * 120, status: "published", rating: 5, parts: [], body: "" },
  {
    hours: 24 * 160,
    status: "rejected",
    rating: 1,
    parts: [],
    reason: "spam",
    body: "Navštívte našu stránku s výhodnými pôžičkami!!!",
  },
];
const SEASON = [4, 3, 2, 1, 1, 2, 3, 4, 2, 1, 1, 3];

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const today = iso(new Date());
const year = Number(today.slice(0, 4));

// ---------------------------------------------------------------- reset
async function demoReservationIds() {
  const rows = must(
    await db.from("reservations").select("id").eq("tenant_id", TENANT).eq("guest_note", NOTE),
    "demo reservations",
  );
  return rows.map((r) => r.id);
}

async function removeDemo() {
  const ids = await demoReservationIds();
  const docs = must(
    await db
      .from("documents")
      .select("id, storage_path")
      .eq("tenant_id", TENANT)
      .like("storage_path", `${TENANT}/demo/%`),
    "demo documents",
  );
  if (docs.length) {
    await db.storage.from("guest-documents").remove(docs.map((d) => d.storage_path));
    must(
      await db
        .from("documents")
        .delete()
        .in(
          "id",
          docs.map((d) => d.id),
        ),
      "delete documents",
    );
  }
  must(
    await db
      .from("notifications")
      .delete()
      .eq("tenant_id", TENANT)
      .filter("data->>demo", "eq", "true"),
    "delete demo notifications",
  );
  // Notifications the events of the demo created: by reservation number or by a demo calendar.
  const numbers = must(
    await db.from("reservations").select("number").eq("tenant_id", TENANT).eq("guest_note", NOTE),
    "demo numbers",
  ).map((r) => r.number);
  for (let i = 0; i < numbers.length; i += 50) {
    must(
      await db
        .from("notifications")
        .delete()
        .eq("tenant_id", TENANT)
        .in("data->>number", numbers.slice(i, i + 50)),
      "delete notifications of demo reservations",
    );
  }
  must(
    await db
      .from("notifications")
      .delete()
      .eq("tenant_id", TENANT)
      .like("data->>channel", "%(ukážka)"),
    "delete notifications of demo calendars",
  );
  if (ids.length) {
    must(await db.from("email_outbox").delete().in("reservation_id", ids), "delete demo e-mails");
    must(await db.from("reservations").delete().in("id", ids), "delete reservations");
  }
  must(
    await db.from("occupancy").delete().eq("tenant_id", TENANT).like("label", "%(DEMO)"),
    "delete blocks",
  );
  must(
    await db.from("ical_channels").delete().eq("tenant_id", TENANT).like("name", "%(ukážka)"),
    "delete channels",
  );
  must(
    await db
      .from("guests")
      .delete()
      .eq("tenant_id", TENANT)
      .or(`email.like.%@${DEMO_DOMAIN},email.eq.${GUEST_ZONE_EMAIL}`),
    "delete guests",
  );
  console.log(`Removed: ${ids.length} reservations, ${docs.length} documents, blocks, channels.`);
}

// ---------------------------------------------------------------- pricing (same as the guest page)
async function catalog() {
  const p = must(
    await db
      .from("properties")
      .select(
        "pricing_model, max_guests, pets_allowed, tourist_tax_included, tourist_tax_cents, accommodation_vat_bp, seasons(*, season_ranges(*)), fees(*), units(id, rates(*))",
      )
      .eq("id", PROPERTY)
      .single(),
    "property",
  );
  const services = must(
    await db
      .from("services")
      .select("*")
      .eq("tenant_id", TENANT)
      .or(`property_id.eq.${PROPERTY},property_id.is.null`),
    "services",
  );
  const discounts = must(
    await db
      .from("discounts")
      .select("*")
      .eq("tenant_id", TENANT)
      .eq("kind", "length_of_stay")
      .or(`property_id.eq.${PROPERTY},property_id.is.null`),
    "discounts",
  );
  const unit = p.units.find((u) => u.id === UNIT);
  return {
    services,
    catalog: {
      currency: "EUR",
      pricingModel: p.pricing_model,
      maxGuests: p.max_guests,
      petsAllowed: p.pets_allowed,
      touristTax: { included: p.tourist_tax_included, amountCents: p.tourist_tax_cents },
      accommodationVatBp: p.accommodation_vat_bp,
      seasons: toSeasons(p.seasons),
      fees: toFees(p.fees),
      services: toServices(services),
      discounts: toDiscounts(discounts),
      rates: Object.fromEntries(unit.rates.map((r) => [r.season_id, r.amount_cents])),
    },
  };
}

function price(cat, stay) {
  const r = calculatePrice(
    {
      currency: cat.currency,
      pricingModel: cat.pricingModel,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: stay.adults,
      children: stay.children ?? 0,
      pets: 0,
      maxGuests: cat.maxGuests,
      petsAllowed: cat.petsAllowed,
      seasons: cat.seasons,
      rates: cat.rates,
      fees: cat.fees,
      selectedFees: {},
      services: cat.services,
      selectedServices: stay.services ?? {},
      discounts: cat.discounts,
      promoCode: null,
      // Booked "today" — length-of-stay discounts and price rules as for a booking made now.
      bookedOn: stay.checkIn < today ? addDays(stay.checkIn, -30) : today,
      touristTax: cat.touristTax,
      accommodationVatBp: cat.accommodationVatBp,
    },
    priceContributorsFor(["services"]),
  );
  if (!r.ok) throw new Error(`price ${stay.checkIn}: ${r.errors.map((e) => e.code).join(", ")}`);
  return r;
}

const label = (l) =>
  l.labelKey === "touristTax"
    ? sk.guest.touristTax
    : (l.name?.sk ?? Object.values(l.name ?? {})[0] ?? "");

// ---------------------------------------------------------------- reservations
const scriptStart = new Date().toISOString();

/**
 * E-mails the demo queues are skipped right away — the minute worker would otherwise send the ones to real
 * addresses (guest b, the owner) before the end of the script.
 */
async function quiet(reservationId) {
  must(
    await db
      .from("email_outbox")
      .update({ status: "skipped", last_error: "DEMO — neodoslané" })
      .eq("tenant_id", TENANT)
      .eq("status", "queued")
      .or(
        `reservation_id.eq.${reservationId},and(kind.eq.owner_ical_conflict,created_at.gte.${scriptStart})`,
      ),
    "quiet e-mails",
  );
}

async function book(cat, stay) {
  // First free term from the wished date (never overwrites anything — the database refuses overlaps).
  const step = stay.step ?? 7;
  for (let shift = 0; shift < (stay.tries ?? 10); shift++) {
    const checkIn = addDays(stay.checkIn, shift * step);
    const checkOut = addDays(stay.checkOut, shift * step);
    let p;
    try {
      p = price(cat, { ...stay, checkIn, checkOut });
    } catch (e) {
      if (stay.optional) continue;
      throw e;
    }
    const { data, error } = await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: PROPERTY,
          unit_id: UNIT,
          check_in: checkIn,
          check_out: checkOut,
          status: "pending_payment",
          source: "direct",
          guest_name: stay.name,
          guest_email: stay.email,
          guest_phone: stay.phone,
          guest_country: "SK",
          adults: stay.adults,
          children: stay.children ?? 0,
          infants: 0,
          pets: 0,
          locale: "sk",
          currency: "EUR",
          total_cents: p.totalCents,
          guest_note: NOTE,
          marketing_consent: false,
          lines: p.lines.map((l) => ({
            kind: l.kind,
            ref_id: l.refId,
            label: label(l),
            quantity: l.quantity,
            unit_amount_cents: l.unitAmountCents,
            amount_cents: l.amountCents,
            vat_bp: l.vatBp,
            meta: l.meta,
          })),
          consents: [
            {
              kind: "terms",
              version: "v1",
              text: sk.guest.booking?.consentTerms ?? "Obchodné podmienky",
              granted: true,
            },
            {
              kind: "cancellation",
              version: "v1",
              text: "Storno podmienky objektu",
              granted: true,
            },
            { kind: "privacy", version: "v1", text: "Ochrana osobných údajov", granted: true },
            { kind: "marketing", version: "v1", text: "Novinky e-mailom", granted: false },
          ],
        },
      })
      .single();
    if (error?.code === "23P01") continue; // term taken → next week
    if (error) throw new Error(`create_reservation: ${error.message}`);
    await quiet(data.id);
    must(
      await db.rpc("store_access_token", { p_reservation_id: data.id, p_token: data.access_token }),
      "store token",
    );
    return { ...data, checkIn, checkOut, total: p.totalCents };
  }
  if (stay.optional) return null;
  throw new Error(`No free term near ${stay.checkIn}`);
}

async function pay(r, actor, receivedAt) {
  must(
    await db
      .from("payments")
      .update({ status: "received", received_at: receivedAt, received_by: actor })
      .eq("reservation_id", r.id)
      .eq("status", "pending"),
    "payment",
  );
  must(
    await db.rpc("change_reservation_status", {
      p_reservation_id: r.id,
      p_to: "confirmed",
      p_actor: actor,
    }),
    "confirm",
  );
  await quiet(r.id);
}

/** A one-page PDF with a title and a few lines (enough for the guest to open and read). */
function pdf(title, lines) {
  const esc = (s) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[()\\]/g, "\\$&");
  const text = [`BT /F1 20 Tf 60 770 Td (${esc(title)}) Tj ET`]
    .concat(lines.map((l, i) => `BT /F1 12 Tf 60 ${730 - i * 20} Td (${esc(l)}) Tj ET`))
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function document(path, title, body, link) {
  must(
    await db.storage
      .from("guest-documents")
      .upload(path, pdf(title, body), { contentType: "application/pdf", upsert: true }),
    `upload ${path}`,
  );
  must(
    await db
      .from("documents")
      .insert({ tenant_id: TENANT, storage_path: path, title: { sk: title }, ...link }),
    `document ${title}`,
  );
}

// ---------------------------------------------------------------- main
if (reset) await removeDemo();
if (!reset && (await demoReservationIds()).length)
  console.log("Demo data already exist (use --reset to create them again).");
else await createDemo();

async function createDemo() {
  const runStart = new Date().toISOString();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const martin = users.users.find((u) => u.email === MARTIN);
  if (!martin) throw new Error(`${MARTIN} has no login on staging`);

  // Martin sees the administration as the owner (besides being platform admin).
  must(
    await db
      .from("memberships")
      .upsert(
        { tenant_id: TENANT, user_id: martin.id, role: "owner" },
        { onConflict: "tenant_id,user_id" },
      ),
    "membership",
  );

  const { catalog: cat, services } = await catalog();
  const chef = services.find((s) => /kuch|chef/i.test(JSON.stringify(s.name)) && s.active);
  if (!chef) console.warn("No active chef service — reservation (a) is created without it.");

  // (a) future, waiting for payment, with the chef
  const a = await book(cat, {
    name: "Katarína Horváthová",
    email: `katarina.horvathova@${DEMO_DOMAIN}`,
    phone: "+421 900 000 101",
    adults: 4,
    children: 2,
    checkIn: `${year + 1}-02-12`,
    checkOut: `${year + 1}-02-15`,
    services: chef ? { [chef.id]: 1 } : {},
  });

  // (b) around Christmas, confirmed and paid, with a reservation document — guest zone for Martin
  const b = await book(cat, {
    name: "Tomáš Kováč",
    email: GUEST_ZONE_EMAIL,
    phone: "+421 900 000 102",
    adults: 4,
    checkIn: `${year}-12-24`,
    checkOut: `${year}-12-28`,
  });
  await pay(b, martin.id, new Date().toISOString());
  await document(
    `${TENANT}/demo/vianoce-${b.number}.pdf`,
    "Vianocny program a pokyny",
    [
      "Ukazkovy dokument k rezervacii (DEMO).",
      "Stedry vecer: vecera o 18:00 v chalete, stromcek je pripraveny.",
      "Sauna je kurena od 16:00, drevo je v pristresku.",
    ],
    { reservation_id: b.id, visible_when: "confirmed" },
  );

  // (c) in the past, paid and completed
  const c = await book(cat, {
    name: "Martina Šimková",
    email: `martina.simkova@${DEMO_DOMAIN}`,
    phone: "+421 900 000 103",
    adults: 2,
    checkIn: `${year}-08-07`,
    checkOut: `${year}-08-10`,
  });
  await pay(c, martin.id, `${year}-07-20T10:00:00Z`);
  must(
    await db.rpc("change_reservation_status", {
      p_reservation_id: c.id,
      p_to: "completed",
      p_actor: martin.id,
    }),
    "complete",
  );

  // Property document for all guests
  await document(
    `${TENANT}/demo/ubytovaci-poriadok.pdf`,
    "Ubytovaci poriadok (ukazka)",
    [
      "Prichod od 15:00, odchod do 10:00.",
      "Nocny kluk od 22:00 do 7:00. Fajcenie len na terase.",
      "Domace zvierata po dohode s majitelkou.",
    ],
    { property_id: PROPERTY, visible_when: "always" },
  );

  // Occupancy: two events from other portals (inactive demo channels — nothing is downloaded) and one owner block.
  const nights = (from, to) => `[${from},${to})`;
  const channels = {};
  for (const [name, source, from, to, uid] of [
    ["Booking.com (ukážka)", "booking", `${year + 1}-01-09`, `${year + 1}-01-12`, "demo-booking-1"],
    ["Airbnb (ukážka)", "airbnb", `${year + 1}-03-05`, `${year + 1}-03-08`, "demo-airbnb-1"],
  ]) {
    const ch = must(
      await db
        .from("ical_channels")
        .insert({
          tenant_id: TENANT,
          unit_id: UNIT,
          name,
          source,
          import_url: `https://example.invalid/${source}.ics`,
          active: false,
          last_status: "ok",
          last_sync_at: new Date().toISOString(),
        })
        .select("id")
        .single(),
      name,
    );
    channels[source] = ch.id;
    const { error } = await db.from("occupancy").insert({
      tenant_id: TENANT,
      unit_id: UNIT,
      kind: "ical",
      ical_channel_id: ch.id,
      ical_uid: uid,
      label: `${source === "booking" ? "Booking.com" : "Airbnb"} (DEMO)`,
      nights: nights(from, to),
    });
    if (error) console.warn(`${name}: term taken, event skipped (${error.message})`);
  }
  {
    const { error } = await db.from("occupancy").insert({
      tenant_id: TENANT,
      unit_id: UNIT,
      kind: "block",
      label: "Údržba sauny (DEMO)",
      nights: nights(`${year + 1}-04-13`, `${year + 1}-04-16`),
      created_by: martin.id,
    });
    if (error) console.warn(`Owner block skipped (${error.message})`);
  }

  // Control centre: the services module in trial, with an audit record.
  const trialEnds = addDays(today, 30);
  must(
    await db.from("tenant_modules").upsert(
      {
        tenant_id: TENANT,
        module_key: "services",
        status: "trial",
        trial_ends_at: trialEnds,
        updated_by: martin.id,
      },
      { onConflict: "tenant_id,module_key" },
    ),
    "module",
  );
  must(
    // write_audit() needs a signed-in user; the service key writes the same row with Martin as the actor.
    await db.from("audit_log").insert({
      tenant_id: TENANT,
      actor_id: martin.id,
      action: "module.changed",
      entity: "module",
      entity_id: "services",
      data: { status: "trial", trial_ends_at: trialEnds, note: "DEMO" },
    }),
    "audit",
  );

  // History of ~18 months (Z27), so Statistics and the overview chart have something to show.
  await createHistory(cat, martin, channels);
  // Reviews of past stays in every state (Z34).
  await demoReviews(martin);
  // Orders after the reservation on (b) (Z35).
  await demoOrders(martin, b);
  // Online check-in of two stays, one foreigner (Z36). Fictional documents.
  await demoCheckins(martin, b);

  // Notifications: the events above created many; keep the bell readable with a handful of typical ones.
  must(
    await db.from("notifications").delete().eq("tenant_id", TENANT).gte("created_at", runStart),
    "clear generated notifications",
  );
  await curatedNotifications(martin, { a, b }, trialEnds);

  // E-mails the demo queued: not sent (Martin's inbox stays quiet; the guest-zone code is sent only on login).
  const ids = await demoReservationIds();
  must(
    await db
      .from("email_outbox")
      .update({ status: "skipped", last_error: "DEMO — neodoslané" })
      .in("reservation_id", ids)
      .in("status", ["queued", "failed"]),
    "skip e-mails",
  );

  const host = "https://chalet-stromy-demo.vercel.app";
  console.log(`
Demo data for Chalet STRÖMY are ready (staging).
  (a) ${a.number}  ${a.checkIn} – ${a.checkOut}  waiting for payment, chef   ${host}/r/${a.access_token}
  (b) ${b.number}  ${b.checkIn} – ${b.checkOut}  confirmed + paid, document   ${host}/r/${b.access_token}
  (c) ${c.number}  ${c.checkIn} – ${c.checkOut}  completed
Guest zone: ${host}/ucet → ${GUEST_ZONE_EMAIL} (the code arrives at ${MARTIN} through the staging redirect).
`);
}

// ---------------------------------------------------------------- reviews (Z34)

function reviewName(full) {
  const parts = full.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

async function demoReviews(martin) {
  must(
    await db
      .from("tenant_modules")
      .upsert(
        { tenant_id: TENANT, module_key: "reviews", status: "active", updated_by: martin.id },
        { onConflict: "tenant_id,module_key" },
      ),
    "reviews module",
  );
  const stays = must(
    await db
      .from("reservations")
      .select("id, guest_name, guest_id, items:reservation_items(check_in, check_out)")
      .eq("tenant_id", TENANT)
      .eq("guest_note", NOTE)
      .eq("status", "completed"),
    "completed stays",
  )
    .map((r) => ({ ...r, checkIn: r.items[0]?.check_in, checkOut: r.items[0]?.check_out }))
    .filter((r) => r.checkOut && r.checkOut < today)
    .sort((x, y) => (x.checkOut < y.checkOut ? 1 : -1));
  let made = 0;
  for (const [i, spec] of REVIEWS.entries()) {
    const stay = stays[i];
    if (!stay) break;
    const submitted = new Date(Date.now() - spec.hours * 3_600_000).toISOString();
    const [c, l, m, v] = spec.parts;
    must(
      await db.from("reviews").insert({
        tenant_id: TENANT,
        property_id: PROPERTY,
        reservation_id: stay.id,
        guest_id: stay.guest_id,
        rating: spec.rating,
        rating_cleanliness: c ?? null,
        rating_location: l ?? null,
        rating_communication: m ?? null,
        rating_value: v ?? null,
        body: spec.body,
        display_name: reviewName(stay.guest_name),
        stay_month: `${stay.checkIn.slice(0, 7)}-01`,
        locale: "sk",
        status: spec.status,
        reject_reason: spec.reason ?? null,
        owner_reply: spec.reply ?? null,
        owner_reply_at: spec.reply ? submitted : null,
        featured: spec.featured ?? false,
        submitted_at: submitted,
        published_at:
          spec.status === "published"
            ? new Date(Date.parse(submitted) + 72 * 3_600_000).toISOString()
            : null,
        rejected_at: spec.status === "rejected" ? submitted : null,
      }),
      "review",
    );
    made++;
  }
  console.log(`Reviews: ${made} (module reviews on).`);
}

// ---------------------------------------------------------------- upsell (Z35)
async function demoOrders(martin, b) {
  // Services are already on (trial, above); upsell needs them.
  must(
    await db
      .from("tenant_modules")
      .upsert(
        { tenant_id: TENANT, module_key: "upsell", status: "active", updated_by: martin.id },
        { onConflict: "tenant_id,module_key" },
      ),
    "upsell module",
  );
  const services = must(
    await db
      .from("services")
      .select("id, name, price_model, amount_cents, vat_bp")
      .eq("tenant_id", TENANT),
    "services",
  );
  const find = (word) => services.find((s) => (s.name?.sk ?? "").includes(word));
  const breakfast = find("Raňajky");
  const chef = find("šéfkuchár");
  const transfer = find("Transfer");
  // Showroom settings: breakfast and transfer straight away, the chef needs the owner's confirmation.
  for (const [s, confirm] of [
    [breakfast, false],
    [chef, true],
    [transfer, false],
  ]) {
    if (s)
      must(
        await db
          .from("services")
          .update({
            upsell_enabled: true,
            upsell_requires_confirmation: confirm,
            upsell_cutoff_hours: 48,
          })
          .eq("id", s.id),
        "service upsell",
      );
  }
  const res = must(
    await db.from("reservations").select("adults, children, currency").eq("id", b.id).single(),
    "reservation b",
  );
  const nights = Math.round((Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86_400_000);
  const persons = res.adults + res.children;
  const cutoff = new Date(Date.parse(`${b.checkIn}T00:00:00Z`) - 48 * 3_600_000).toISOString();
  const order = (s, quantity, extra) => ({
    tenant_id: TENANT,
    reservation_id: b.id,
    service_id: s.id,
    label: s.name.sk,
    price_model: s.price_model,
    items: 1,
    quantity,
    unit_amount_cents: s.amount_cents,
    amount_cents: s.amount_cents * quantity,
    currency: res.currency,
    vat_bp: s.vat_bp,
    cutoff_at: cutoff,
    ordered_via: "link",
    ...extra,
  });
  const rows = [
    breakfast &&
      order(breakfast, persons * nights, { payment_method: "stay_account", status: "confirmed" }),
    chef &&
      order(chef, persons, {
        payment_method: "stay_account",
        status: "awaiting_confirmation",
        service_date: addDays(b.checkIn, 1),
      }),
    transfer &&
      order(transfer, 1, {
        payment_method: "transfer",
        status: "declined",
        decline_reason: "V tento deň už transfer nejazdí — pošleme vám kontakt na taxi.",
        decided_at: new Date().toISOString(),
        decided_by: martin.id,
      }),
  ].filter(Boolean);
  must(await db.from("reservation_orders").insert(rows), "orders");
  await quiet(b.id);
  console.log(`Orders: ${rows.length} on ${b.number} (module upsell on).`);
}

// ---------------------------------------------------------------- online check-in (Z36)
async function demoCheckins(martin, b) {
  must(
    await db
      .from("tenant_modules")
      .upsert(
        { tenant_id: TENANT, module_key: "checkin", status: "active", updated_by: martin.id },
        { onConflict: "tenant_id,module_key" },
      ),
    "checkin module",
  );
  const next = must(
    await db
      .from("reservations")
      .select("id, number, items:reservation_items(check_in)")
      .eq("tenant_id", TENANT)
      .eq("guest_note", NOTE)
      .eq("status", "confirmed")
      .neq("id", b.id),
    "upcoming stays",
  )
    .filter((r) => r.items[0]?.check_in >= today)
    .sort((x, y) => (x.items[0].check_in < y.items[0].check_in ? -1 : 1))[0];
  const person = (reservationId, sort, p) => ({
    tenant_id: TENANT,
    reservation_id: reservationId,
    sort,
    is_citizen: true,
    nationality: "SK",
    document_type: "id_card",
    ...p,
  });
  must(
    await db.from("checkins").insert([
      {
        tenant_id: TENANT,
        reservation_id: b.id,
        status: "completed",
        arrival_time: "16:00",
        house_rules_accepted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed_via: "link",
      },
      ...(next
        ? [
            {
              tenant_id: TENANT,
              reservation_id: next.id,
              status: "in_progress",
              arrival_time: "18:30",
            },
          ]
        : []),
    ]),
    "checkins",
  );
  must(
    await db
      .from("checkin_guests")
      .insert([
        person(b.id, 0, {
          first_name: "Tomáš",
          last_name: "Kováč",
          birth_date: "1984-03-12",
          document_number: "EA000101",
          address: "Hlavná 1, 058 01 Poprad (DEMO)",
        }),
        person(b.id, 1, {
          first_name: "Zuzana",
          last_name: "Kováčová",
          birth_date: "1986-07-02",
          document_number: "EA000102",
          address: "Hlavná 1, 058 01 Poprad (DEMO)",
        }),
        person(b.id, 2, {
          first_name: "Oliver",
          last_name: "Brown",
          is_citizen: false,
          nationality: "GB",
          birth_date: "1979-11-20",
          document_type: "passport",
          document_number: "DEMO12345",
          address: "1 Demo Street, London (DEMO)",
        }),
        person(b.id, 3, {
          first_name: "Emma",
          last_name: "Brown",
          is_citizen: false,
          nationality: "GB",
          birth_date: "2012-04-08",
          document_type: "passport",
          document_number: "DEMO12346",
          address: "1 Demo Street, London (DEMO)",
        }),
        ...(next
          ? [
              person(next.id, 0, {
                first_name: "Peter",
                last_name: "Demo",
                document_number: "EA000201",
                address: "Námestie 2, Košice (DEMO)",
              }),
            ]
          : []),
      ]),
    "checkin guests",
  );
  console.log(
    `Check-in: completed on ${b.number}${next ? `, in progress on ${next.number}` : ""} (module checkin on).`,
  );
}

// ---------------------------------------------------------------- history (Z27)
function monthStart(offset) {
  const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return iso(d);
}

async function createHistory(cat, martin, channels) {
  let k = 0;
  let made = 0;
  for (let m = -18; m <= 3; m++) {
    const first = monthStart(m);
    const count = SEASON[Number(first.slice(5, 7)) - 1];
    for (let j = 0; j < count; j++, k++) {
      const day = 1 + Math.floor(((j + 0.3) / count) * 26);
      const length = 2 + (k % 4);
      const checkIn = addDays(first, day - 1);
      const checkOut = addDays(checkIn, length);
      // The stay around today is left out (nothing in progress in the demo).
      if (checkIn <= addDays(today, 2) && checkOut >= today) continue;
      const name = GUESTS[k % GUESTS.length];
      const slug = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]+/g, ".");
      const r = await book(cat, {
        name,
        email: `${slug}.${k}@${DEMO_DOMAIN}`,
        phone: `+421 900 100 ${String(100 + k).slice(-3)}`,
        adults: 2 + (k % 3) * 2,
        children: k % 5 === 0 ? 2 : 0,
        checkIn,
        checkOut,
        step: 1,
        tries: 4,
        optional: true,
      });
      if (!r) continue;
      made++;
      const created = [addDays(r.checkIn, -(12 + ((k * 13) % 50))), today].sort()[0];
      const paidAt = `${[addDays(created, 2), today].sort()[0]}T10:00:00Z`;
      if (k % 13 === 5) {
        must(
          await db.rpc("change_reservation_status", {
            p_reservation_id: r.id,
            p_to: "cancelled",
            p_actor: martin.id,
            p_reason: "guest_request",
          }),
          "cancel",
        );
      } else {
        await pay(r, martin.id, paidAt);
        if (r.checkOut <= today)
          must(
            await db.rpc("change_reservation_status", {
              p_reservation_id: r.id,
              p_to: "completed",
              p_actor: martin.id,
            }),
            "complete",
          );
      }
      must(
        await db
          .from("reservations")
          .update({ created_at: `${created}T09:30:00Z` })
          .eq("id", r.id),
        "created_at",
      );
    }
    // A stay from a portal in most months (occupancy only — portals send no amounts).
    if (m % 3 !== 1) {
      const source = m % 2 ? "airbnb" : "booking";
      const from = addDays(first, 20);
      const { error } = await db.from("occupancy").insert({
        tenant_id: TENANT,
        unit_id: UNIT,
        kind: "ical",
        ical_channel_id: channels[source],
        ical_uid: `demo-history-${first}`,
        label: `${source === "booking" ? "Booking.com" : "Airbnb"} (DEMO)`,
        nights: `[${from},${addDays(from, 3)})`,
      });
      if (error && error.code !== "23P01") throw new Error(`portal stay: ${error.message}`);
    }
  }
  console.log(`History: ${made} reservations over 22 months.`);
}

async function curatedNotifications(martin, { a, b }, trialEnds) {
  const ago = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString();
  const facts = async (id) =>
    must(
      await db
        .from("reservations")
        .select(
          "number, guest_name, total_cents, currency, payment_due_at, items:reservation_items(check_in, check_out)",
        )
        .eq("id", id)
        .single(),
      "facts",
    );
  const [fa, fb] = [await facts(a.id), await facts(b.id)];
  // The newest review waiting for publication (Z34).
  const { data: review } = await db
    .from("reviews")
    .select("id, display_name, rating, submitted_at, reservation:reservations(number)")
    .eq("tenant_id", TENANT)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const data = (r) => ({
    number: r.number,
    guest: r.guest_name,
    total_cents: r.total_cents,
    currency: r.currency,
    due_at: r.payment_due_at,
    check_in: r.items[0]?.check_in,
    check_out: r.items[0]?.check_out,
    demo: true,
  });
  const rows = [
    ...(review
      ? [
          {
            kind: "review_new",
            data: {
              guest: review.display_name,
              rating: review.rating,
              property: "Chalet STRÖMY",
              number: review.reservation?.number,
              demo: true,
            },
            target: `/admin/reviews?panel=review:${review.id}`,
            at: review.submitted_at,
          },
        ]
      : []),
    {
      kind: "reservation_new",
      data: data(fa),
      target: `/admin/reservations?panel=reservation:${a.id}`,
      at: ago(2),
    },
    {
      kind: "portal_booking",
      data: {
        channel: "Booking.com (ukážka)",
        check_in: `${year + 1}-01-09`,
        check_out: `${year + 1}-01-12`,
        demo: true,
      },
      target: `/admin/calendar?month=${year + 1}-01`,
      at: ago(20),
    },
    {
      kind: "payment_received",
      data: data(fb),
      target: `/admin/reservations?panel=reservation:${b.id}`,
      at: ago(30),
      read: true,
    },
    {
      kind: "trial_ending",
      data: { module: "services", ends_at: trialEnds, days: 7, demo: true },
      target: "/admin",
      at: ago(50),
      read: true,
    },
  ];
  const inserted = must(
    await db
      .from("notifications")
      .insert(
        rows.map((r, i) => ({
          tenant_id: TENANT,
          audience: "tenant",
          kind: r.kind,
          data: r.data,
          target: r.target,
          created_at: r.at,
          dedupe_key: `demo:${r.kind}:${i}:${runId}`,
        })),
      )
      .select("id, kind"),
    "notifications",
  );
  const read = inserted.filter((n, i) => rows[i].read).map((n) => n.id);
  if (read.length)
    must(
      await db
        .from("notification_reads")
        .insert(read.map((id) => ({ notification_id: id, user_id: martin.id }))),
      "reads",
    );
}
