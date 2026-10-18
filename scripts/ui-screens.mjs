// Screenshots of the screens the interface rules touch (Z54, docs/pravidla-rozhrania.md) — PC 1440 px and phone 390 px.
//
//   npm run e2e:server                                   (local server against STAGING)
//   node scripts/ui-screens.mjs docs/snimky/z54/pred     (or …/po)
//
// Demo client only. Owner and platform admin sign in with the QA test accounts; the guest is a temporary test guest
// (@booking-platform.test) with one confirmed stay and a message, deleted at the end. No personal data in the pictures.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing");
if (/prod/i.test(url)) throw new Error("Screenshots are made on staging only");

const OUT = process.argv[2];
if (!OUT) throw new Error("Usage: node scripts/ui-screens.mjs <output directory>");
const ADMIN = "http://localhost:3100";
const GUEST = "http://ukazka.localhost:3100";
const TENANT = "a0000000-0000-4000-8000-000000000001";
const PROPERTY = "b0000000-0000-4000-8000-000000000001";
const UNIT = "c0000000-0000-4000-8000-000000000010";
const db = createClient(url, key, { auth: { persistSession: false } });
const jiti = createJiti(import.meta.url, {
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
});
const { TOURS } = await jiti.import("@/core/tours/tours");
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function userLink(email, { owner, platformAdmin }) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user)
    user = must(await db.auth.admin.createUser({ email, email_confirm: true }), email).user;
  if (owner)
    must(
      await db
        .from("memberships")
        .upsert(
          { tenant_id: TENANT, user_id: user.id, role: "owner" },
          { onConflict: "tenant_id,user_id" },
        ),
      "membership",
    );
  if (platformAdmin)
    must(
      await db.from("platform_admins").upsert({ user_id: user.id }, { onConflict: "user_id" }),
      "admin",
    );
  // Tours seen, so the "What's new" window does not cover the screenshot.
  await db
    .from("profiles")
    .update({ tours_seen: { owner: TOURS.owner.version, admin: TOURS.admin.version } })
    .eq("id", user.id);
  return must(await db.auth.admin.generateLink({ type: "magiclink", email }), "link").properties
    .hashed_token;
}

const VIEWPORTS = {
  pc: { width: 1440, height: 900 },
  mobil: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

async function context(browser, vp, base) {
  const { width, height, ...rest } = VIEWPORTS[vp];
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...rest,
    locale: "sk-SK",
    timezoneId: "Europe/Bratislava",
    colorScheme: "light",
  });
  await ctx.addCookies([{ name: "active_tenant", value: TENANT, url: base }]);
  return ctx;
}

async function shoot(page, name, path, vp) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.mouse.move(VIEWPORTS[vp].width - 2, VIEWPORTS[vp].height - 2);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/${name}-${vp}.jpg`,
    type: "jpeg",
    quality: 72,
    fullPage: true,
  });
  console.log(`  ${name}-${vp}.jpg`);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const guestEmail = `ui-screens-${Date.now()}@booking-platform.test`;
let stayId = null;
try {
  // A confirmed stay of a test guest with one message from the owner.
  const { data: busy } = await db.rpc("unit_busy_nights", {
    p_unit_id: UNIT,
    p_from: `${new Date().getUTCFullYear() + 1}-05-01`,
    p_to: `${new Date().getUTCFullYear() + 1}-09-30`,
  });
  // Busy nights come as date ranges "[a,b)" — every night inside is taken.
  const taken = new Set();
  for (const r of busy ?? []) {
    const m = /(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})/.exec(String(r.nights ?? r));
    if (!m) continue;
    for (
      let d = new Date(`${m[1]}T00:00:00Z`);
      d.toISOString().slice(0, 10) < m[2];
      d.setUTCDate(d.getUTCDate() + 1)
    )
      taken.add(d.toISOString().slice(0, 10));
  }
  let checkIn = null;
  for (
    let d = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 4, 1));
    !checkIn;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const days = [0, 1].map((i) => new Date(d.getTime() + i * 864e5).toISOString().slice(0, 10));
    if (days.every((x) => !taken.has(x))) checkIn = days[0];
  }
  const checkOut = new Date(Date.parse(checkIn) + 2 * 864e5).toISOString().slice(0, 10);
  const created = must(
    await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: PROPERTY,
          unit_id: UNIT,
          guest_name: "Snímka Testová",
          guest_email: guestEmail,
          adults: 2,
          currency: "EUR",
          total_cents: 64000,
          status: "confirmed",
          lines: [
            {
              kind: "accommodation",
              label: "Ubytovanie",
              quantity: 2,
              unit_amount_cents: 32000,
              amount_cents: 64000,
            },
          ],
          check_in: checkIn,
          check_out: checkOut,
        },
      })
      .single(),
    "stay",
  );
  stayId = created.id;
  await db.from("messages").insert({
    tenant_id: TENANT,
    reservation_id: stayId,
    sender: "staff",
    body: "Dobrý deň, tešíme sa na vás. Ak budete čokoľvek potrebovať, napíšte nám sem.",
  });

  for (const vp of Object.keys(VIEWPORTS)) {
    console.log(`Owner (${vp}):`);
    const o = await context(browser, vp, ADMIN);
    const op = await o.newPage();
    const ot = await userLink("qa@booking-platform.test", { owner: true });
    await op.goto(`${ADMIN}/auth/confirm?token_hash=${ot}&type=magiclink&next=/admin`);
    await op.waitForURL(/\/admin/);
    await shoot(op, "objekt-udaje", `${ADMIN}/admin/properties/${PROPERTY}`, vp);
    await shoot(op, "ceny-a-sezony", `${ADMIN}/admin/properties/${PROPERTY}/pricing`, vp);
    await shoot(op, "rezervacie", `${ADMIN}/admin/reservations`, vp);
    await shoot(op, "kalendar", `${ADMIN}/admin/calendar`, vp);
    await shoot(op, "nastavenia", `${ADMIN}/admin/settings`, vp);
    await o.close();

    console.log(`Control center (${vp}):`);
    const a = await context(browser, vp, ADMIN);
    const ap = await a.newPage();
    const at = await userLink("qa-admin@booking-platform.test", { platformAdmin: true });
    await ap.goto(`${ADMIN}/auth/confirm?token_hash=${at}&type=magiclink&next=/platform`);
    await ap.waitForURL(/\/platform/);
    await shoot(ap, "katalog-modulov", `${ADMIN}/platform/modules`, vp);
    await shoot(ap, "detail-klienta", `${ADMIN}/platform/tenants/${TENANT}`, vp);
    await a.close();

    console.log(`Guest (${vp}):`);
    const g = await context(browser, vp, GUEST);
    const gp = await g.newPage();
    await gp.goto(`${GUEST}/ucet`);
    await gp.waitForURL(/\/ucet\/prihlasenie/);
    await gp.getByLabel("E-mail").fill(guestEmail);
    await gp.getByRole("button", { name: "Poslať kód" }).click();
    const first = gp.getByLabel(/^Číslica 1 z/);
    await first.waitFor();
    const otp = must(
      await db.auth.admin.generateLink({ type: "magiclink", email: guestEmail }),
      "otp",
    ).properties.email_otp;
    await first.fill(otp);
    await gp.getByRole("button", { name: "Prihlásiť sa" }).click();
    await gp.waitForURL(/\/ucet$/);
    await shoot(gp, "ucet-pobyt", `${GUEST}/ucet/pobyt/${stayId}`, vp);
    await shoot(gp, "ucet-udaje", `${GUEST}/ucet/udaje`, vp);
    await g.close();
  }
} finally {
  await browser.close();
  if (stayId) await db.from("reservations").delete().eq("id", stayId);
  const { data: guest } = await db
    .from("guests")
    .select("id, user_id")
    .eq("tenant_id", TENANT)
    .eq("email", guestEmail)
    .maybeSingle();
  if (guest) await db.from("guests").delete().eq("id", guest.id);
  if (guest?.user_id) await db.auth.admin.deleteUser(guest.user_id);
}
