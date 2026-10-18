// Test of the surgical restore on the Ukážkový klient only (Z52) — run by .github/workflows/restore-tenant-test.yml:
//   prepare → (dump) → damage → restore-tenant.mjs --apply --yes → verify → cleanup.
// Creates its own records (a reservation with its lines, two quick replies), never touches other data on purpose
// and never STRÖMY. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; prepare writes ids to $GITHUB_ENV.
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const TENANT = "a0000000-0000-4000-8000-000000000001"; // Ukážkový klient
const PROPERTY = "b0000000-0000-4000-8000-000000000001";
const UNIT = "c0000000-0000-4000-8000-000000000010";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const step = process.argv[2];
const env = (k) => process.env[k];
const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};

if (step === "prepare") {
  const stamp = Date.now().toString(36);
  let reservation = null;
  for (let i = 0; i < 40 && !reservation; i++) {
    const d = new Date(
      Date.UTC(new Date().getUTCFullYear() + 2, 0, 1 + Math.floor(Math.random() * 300)),
    );
    const checkIn = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 2);
    const { data, error } = await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: PROPERTY,
          unit_id: UNIT,
          guest_name: `Obnova Testová ${stamp}`,
          guest_email: `restore-${stamp}+b@booking-platform.test`,
          adults: 2,
          currency: "EUR",
          total_cents: 20000,
          status: "confirmed",
          lines: [
            {
              kind: "accommodation",
              label: "Pobyt",
              quantity: 2,
              unit_amount_cents: 10000,
              amount_cents: 20000,
            },
          ],
          check_in: checkIn,
          check_out: d.toISOString().slice(0, 10),
        },
      })
      .single();
    if (!error) reservation = data.id;
    else if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`))
      fail(error.message);
  }
  if (!reservation) fail("no free stay");
  const { data: q, error } = await db
    .from("quick_replies")
    .insert({ tenant_id: TENANT, title: `Obnova ${stamp}`, body: "Pôvodný text", sort: 999 })
    .select("id")
    .single();
  if (error) fail(error.message);
  appendFileSync(env("GITHUB_ENV"), `R1=${reservation}\nQ1=${q.id}\nSTAMP=${stamp}\n`);
  console.log("Prepared a reservation and a quick reply on the Ukážkový klient.");
} else if (step === "damage") {
  // After the dump: the reservation is deleted (with its items, lines, payment), the quick reply changed, a new one added.
  const { error: e1 } = await db
    .from("reservations")
    .delete()
    .eq("id", env("R1"))
    .eq("tenant_id", TENANT);
  const { error: e2 } = await db
    .from("quick_replies")
    .update({ body: "Zmenený text" })
    .eq("id", env("Q1"));
  const { data: q2, error: e3 } = await db
    .from("quick_replies")
    .insert({ tenant_id: TENANT, title: `Po zálohe ${env("STAMP")}`, body: "Nový", sort: 999 })
    .select("id")
    .single();
  if (e1 || e2 || e3) fail((e1 ?? e2 ?? e3).message);
  appendFileSync(env("GITHUB_ENV"), `Q2=${q2.id}\n`);
  console.log("Damaged: reservation deleted, quick reply changed, a new one added.");
} else if (step === "verify") {
  const { data: r } = await db
    .from("reservations")
    .select("id, guest_name")
    .eq("id", env("R1"))
    .maybeSingle();
  const { count: lines } = await db
    .from("reservation_lines")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", env("R1"));
  const { count: items } = await db
    .from("reservation_items")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", env("R1"));
  const { data: q1 } = await db
    .from("quick_replies")
    .select("body")
    .eq("id", env("Q1"))
    .maybeSingle();
  const { data: q2 } = await db
    .from("quick_replies")
    .select("id")
    .eq("id", env("Q2"))
    .maybeSingle();
  const { data: audit } = await db
    .from("audit_log")
    .select("id")
    .eq("tenant_id", TENANT)
    .eq("action", "tenant.restored")
    .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString());
  const checks = {
    "reservation back": Boolean(r),
    "its lines back": (lines ?? 0) > 0,
    "its item back": (items ?? 0) > 0,
    "changed quick reply back": q1?.body === "Pôvodný text",
    "quick reply added after the backup removed": !q2,
    "restore in the audit": (audit ?? []).length > 0,
  };
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (Object.values(checks).some((ok) => !ok)) fail("The restore did not bring the data back.");
  console.log("Restore verified.");
} else if (step === "cleanup") {
  if (env("R1")) await db.from("reservations").delete().eq("id", env("R1")).eq("tenant_id", TENANT);
  for (const id of [env("Q1"), env("Q2")].filter(Boolean))
    await db.from("quick_replies").delete().eq("id", id).eq("tenant_id", TENANT);
  console.log("Cleaned up.");
} else {
  fail("usage: restore-tenant-check.mjs prepare|damage|verify|cleanup");
}
