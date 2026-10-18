// Screenshots for the "What's new" tours (Z22) → public/tours/<tour>/<slide>.jpg
//
//   npm run build && npm start -- -p 3100      (local server against STAGING)
//   npm run demo-data                          (demo data of the demo client, Z21/Z41)
//   npm run tour:screens                       (desktop 1440 px)
//
// Signs in two test accounts through one-time links (staging only): qa@booking-platform.test (owner of the demo client) and
// qa-admin@booking-platform.test (platform admin). Guests that are not demo records are blurred — no personal data
// ends up in the repository.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { createJiti } from "jiti";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");
if (/prod/i.test(url)) throw new Error("Screenshots are made on staging only");

const BASE = process.env.TOUR_BASE_URL ?? "http://localhost:3100";
// The demo client (Z41) — Chalet STRÖMY has a real Booking calendar and no demo data.
const TENANT = "a0000000-0000-4000-8000-000000000001";
const PROPERTY = "b0000000-0000-4000-8000-000000000001";
const DEMO_NOTE = "DEMO — ukážková rezervácia (scripts/demo-data.mjs)";
const OUT = fileURLToPath(new URL("../public/tours/", import.meta.url));

const db = createClient(url, key, { auth: { persistSession: false } });
const jiti = createJiti(import.meta.url, {
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
});
const { TOURS } = await jiti.import("@/core/tours/tours");

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

/** Test login on staging, with the tours already marked as seen (the window would cover the screenshot). */
async function testUser(email, { owner, platformAdmin }) {
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
      "platform admin",
    );
  must(
    await db
      .from("profiles")
      .update({ tours_seen: { owner: TOURS.owner.version, admin: TOURS.admin.version } })
      .eq("id", user.id),
    "tours seen",
  );
  const link = must(await db.auth.admin.generateLink({ type: "magiclink", email }), "link");
  return link.properties.hashed_token;
}

// Guests that are not demo records — blurred wherever they appear.
const reservations = must(
  await db
    .from("reservations")
    .select("id, number, guest_name, guest_email, guest_note")
    .eq("tenant_id", TENANT),
  "reservations",
);
const demo = reservations.filter((r) => r.guest_note === DEMO_NOTE);
const pendingDemo = must(
  await db
    .from("reservations")
    .select("id")
    .in(
      "id",
      demo.map((r) => r.id),
    )
    .eq("status", "pending_payment"),
  "pending demo",
)[0];
if (!pendingDemo) throw new Error("Demo data missing — run npm run demo-data first");
// A demo stay with orders on its stay account (upsell) and a confirmed one for the basis of the document (Z51).
const withOrders = must(
  await db
    .from("reservation_orders")
    .select("reservation_id")
    .eq("tenant_id", TENANT)
    .in(
      "reservation_id",
      demo.map((r) => r.id),
    )
    .limit(1),
  "orders",
)[0];
const confirmedDemo = must(
  await db
    .from("reservations")
    .select("id")
    .in(
      "id",
      demo.map((r) => r.id),
    )
    .in("status", ["confirmed", "completed"])
    .limit(1),
  "confirmed demo",
)[0];
if (!withOrders || !confirmedDemo)
  throw new Error("Demo orders missing — run npm run demo-data first");
const privateTexts = reservations
  .filter((r) => r.guest_note !== DEMO_NOTE)
  .flatMap((r) => [r.guest_name, r.guest_email])
  .filter((s) => s && s.length > 2);

async function blurPrivate(page) {
  await page.evaluate((texts) => {
    // Any real-looking e-mail (staff in the audit log, guests) — only the demo and test domains stay readable.
    const email =
      /[\w.+-]+@(?!(?:stromy|ukazka)-demo\.invalid\b|booking-platform\.test\b)[\w-]+\.[\w.-]+/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      if (texts.some((t) => text.includes(t))) {
        const box = n.parentElement.closest("tr, li, a, [data-slot=card]") ?? n.parentElement;
        box.style.filter = "blur(6px)";
      } else if (email.test(text)) n.parentElement.style.filter = "blur(5px)";
    }
  }, privateTexts);
}

async function shoot(page, tour, slide, path, opts = {}) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
  if (opts.heading) {
    // Several slides share one page: a frame shows which card the slide is about.
    await page
      .getByText(opts.heading, { exact: true })
      .first()
      .evaluate((el) => {
        const card = el.closest("[data-slot=card]") ?? el.parentElement;
        card.style.outline = "3px solid var(--primary)";
        card.style.outlineOffset = "4px";
        card.scrollIntoView({ block: "center" });
      });
  }
  await blurPrivate(page);
  if (opts.menu) {
    // The menu itself: expanded rail with the Reservations and Property groups open.
    await page.locator("aside").hover();
    // Only the active page's group is open (v1.2) — the calendar page shows Rezervácie expanded.
    await page.waitForTimeout(400);
  } else {
    // Mouse away from the side menu (hovering expands it) and wait until it has collapsed.
    await page.mouse.move(page.viewportSize().width - 4, page.viewportSize().height - 4);
    await page.waitForTimeout(400);
  }
  if (opts.bell) {
    await page
      .getByRole("button", { name: /^Upozornenia/ })
      .first()
      .click();
    await page.waitForTimeout(300);
    await blurPrivate(page); // the list appears only now
  }
  mkdirSync(`${OUT}${tour}`, { recursive: true });
  await page.screenshot({ path: `${OUT}${tour}/${slide}.jpg`, type: "jpeg", quality: 78 });
  console.log(`  ${tour}/${slide}.jpg`);
}

async function session(browser, email, roles) {
  const token = await testUser(email, roles);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "sk-SK",
    timezoneId: "Europe/Bratislava",
    colorScheme: "light",
  });
  await context.addCookies([{ name: "active_tenant", value: TENANT, url: BASE }]);
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/confirm?token_hash=${token}&type=magiclink&next=/admin`);
  await page.waitForURL(/\/admin/);
  return page;
}

const browser = await chromium.launch();
try {
  console.log("Owner tour:");
  const o = await session(browser, "qa@booking-platform.test", { owner: true });
  // January: an event from Booking.com next to other stays.
  const month = `${new Date().getFullYear() + 1}-01`;
  const shots = {
    messages: ["/admin/messages"],
    autoMessages: ["/admin/messages/auto"],
    checkin: ["/admin/arrivals"],
    upsell: [
      `/admin/reservations?panel=reservation:${withOrders.reservation_id}`,
      { heading: "Účet pobytu" },
    ],
    reviews: ["/admin/reviews"],
    collisions: ["/admin/collisions"],
    storno: ["/admin/settings", { heading: "Storno pásma (výpočet vrátenej sumy)" }],
    invoice: [
      `/admin/reservations?panel=reservation:${confirmedDemo.id}`,
      { heading: "Podklad na doklad" },
    ],
    menu: ["/admin/calendar", { menu: true }],
    statistics: ["/admin/statistics"],
    notifications: ["/admin", { bell: true }],
    dashboard: ["/admin"],
    reservations: ["/admin/reservations"],
    payment: [`/admin/reservations?panel=reservation:${pendingDemo.id}`],
    calendar: [`/admin/calendar?month=${month}`],
    manual: ["/admin/reservations/new"],
    property: [`/admin/properties/${PROPERTY}/page`],
    services: ["/admin/services"],
    ical: ["/admin/ical"],
    settings: ["/admin/settings"],
  };
  for (const s of TOURS.owner.slides) await shoot(o, "owner", s.id, ...shots[s.id]);

  console.log("Admin tour:");
  // The platform admin is not a member of the client (v1.1) — it enters through "Otvoriť administráciu".
  const a = await session(browser, "qa-admin@booking-platform.test", {
    owner: false,
    platformAdmin: true,
  });
  const detail = `/platform/tenants/${TENANT}`;
  const adminShots = {
    tenants: ["/platform"],
    newTenant: ["/platform/new"],
    detail: [detail],
    modules: ["/platform/modules"],
    health: ["/platform/status"],
    theme: [`${detail}/theme`],
    audit: ["/platform/audit"],
    ownerView: [`/platform/enter/${TENANT}`],
  };
  for (const s of TOURS.admin.slides) await shoot(a, "admin", s.id, ...adminShots[s.id]);
} finally {
  await browser.close();
}
