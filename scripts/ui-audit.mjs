// Check of all screens by the interface rules (Z61, docs/pravidla-rozhrania.md) — PC 1440 px and phone 390 px.
//
//   npm run e2e:server                         (local server against STAGING)
//   node scripts/ui-audit.mjs docs/snimky/z61  (screenshots + report.json + report.md)
//
// What a machine can check is checked on every screen: axe (serious/critical), sideways scroll, white fields with an
// edge of 3 : 1 against their surface (rule 1), a card in a card (rule 1), fields leaving their card (rule 6), the ⓘ right
// after the title in the administration (rule 8). The rest (hover, save bar, compact lists) is looked at on the pictures.
// Demo client only; the guest is a temporary test guest (@booking-platform.test) with one stay, deleted at the end.
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing");
if (/prod/i.test(url)) throw new Error("Staging only");

const OUT = process.argv[2] ?? "docs/snimky/z61";
const ONLY = process.argv[3] ? new RegExp(process.argv[3]) : null;
const ADMIN = "http://localhost:3100";
const GUEST = "http://ukazka.localhost:3100";
const TENANT = "a0000000-0000-4000-8000-000000000001";
const PROPERTY = "b0000000-0000-4000-8000-000000000001";
const UNIT = "c0000000-0000-4000-8000-000000000010";
const db = createClient(url, key, { auth: { persistSession: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const OWNER_PAGES = [
  ["prehlad", "/admin"],
  ["kalendar", "/admin/calendar"],
  ["rezervacie", "/admin/reservations"],
  ["rezervacia-panel", "/admin/reservations?panel=reservation:{stay}"],
  ["rucna-rezervacia", "/admin/reservations/new"],
  ["hostia", "/admin/guests"],
  ["prichody", "/admin/arrivals"],
  ["z-portalov", "/admin/portal-stays"],
  ["kolizie", "/admin/collisions"],
  ["blokacie", "/admin/blocks"],
  ["spravy", "/admin/messages"],
  ["automaticke-spravy", "/admin/messages/auto"],
  ["recenzie", "/admin/reviews"],
  ["sluzby", "/admin/services"],
  ["referencie", "/admin/testimonials"],
  ["statistiky", "/admin/statistics"],
  ["vypis", "/admin/statistics/report"],
  ["objekty", "/admin/properties"],
  ["objekt-udaje", `/admin/properties/${PROPERTY}`],
  ["objekt-fotky", `/admin/properties/${PROPERTY}/photos`],
  ["objekt-stranka", `/admin/properties/${PROPERTY}/page`],
  ["objekt-poloha", `/admin/properties/${PROPERTY}/location`],
  ["objekt-ceny", `/admin/properties/${PROPERTY}/pricing`],
  ["objekt-poplatky", `/admin/properties/${PROPERTY}/extras`],
  ["objekt-dokumenty", `/admin/properties/${PROPERTY}/documents`],
  ["nastavenia", "/admin/settings"],
  ["nastavenia-platby", "/admin/settings?tab=platby"],
  ["nastavenia-pravidla", "/admin/settings?tab=pravidla"],
  ["nastavenia-prepojenia", "/admin/settings?tab=prepojenia"],
  ["nastavenia-upozornenia", "/admin/settings?tab=upozornenia"],
  ["nastavenia-tim", "/admin/settings?tab=tim"],
  ["nastavenia-vypis", "/admin/settings?tab=vypis"],
  ["kos", "/admin/settings/trash"],
  ["pomoc", "/admin/help"],
];
const PLATFORM_PAGES = [
  ["rc-klienti", "/platform"],
  ["rc-novy-klient", "/platform/new"],
  ["rc-audit", "/platform/audit"],
  ["rc-katalog", "/platform/modules"],
  ["rc-skusky", "/platform/modules/trials"],
  ["rc-stav", "/platform/status"],
  ["rc-upozornenia", "/platform/notifications"],
  ["rc-podpora", "/platform/support"],
  ["rc-klient", `/platform/tenants/${TENANT}`],
  ["rc-klient-moduly", `/platform/tenants/${TENANT}/modules`],
  ["rc-klient-ludia", `/platform/tenants/${TENANT}/people`],
  ["rc-klient-domeny", `/platform/tenants/${TENANT}/domains`],
  ["rc-klient-vzhlad", `/platform/tenants/${TENANT}/theme`],
  ["rc-klient-zaznam", `/platform/tenants/${TENANT}/audit`],
];
const GUEST_PAGES = [
  ["host-objekt", "/p/chalet-pod-smrekom"],
  ["host-pristup", "/r/{token}"],
  ["host-ucet", "/ucet"],
  ["host-pobyt", "/ucet/pobyt/{stay}"],
  ["host-pobyt-spravy", "/ucet/pobyt/{stay}/spravy"],
  ["host-pobyt-checkin", "/ucet/pobyt/{stay}/checkin"],
  ["host-udaje", "/ucet/udaje"],
];

const VIEWPORTS = {
  pc: { width: 1440, height: 900 },
  mobil: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

/** Machine checks on the open page (rules 1, 6, 8). */
async function rules(page, area) {
  return page.evaluate((area) => {
    const out = [];
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (c) => c && c !== "transparent" && !(rgb(c)[3] === 0);
    const lum = (c) => {
      const [r, g, b] = rgb(c).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const surface = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const bg = getComputedStyle(p).backgroundColor;
        if (opaque(bg)) return bg;
      }
      return "rgb(255, 255, 255)";
    };
    const name = (el) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("name") ? `[name=${el.getAttribute("name")}]` : ""}`;
    if (document.documentElement.scrollWidth > window.innerWidth + 1)
      out.push(
        `6: stránka sa posúva do strany o ${document.documentElement.scrollWidth - window.innerWidth} px`,
      );
    // Rule 1: fields white, their edge 3 : 1 against the surface around.
    for (const el of document.querySelectorAll(
      "main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), main select, main textarea",
    )) {
      if (el.offsetParent === null || el.disabled || el.dataset.field === "bare") continue;
      const s = getComputedStyle(el);
      if (s.borderTopWidth === "0px" && s.borderBottomWidth === "0px") continue;
      const around = surface(el);
      if (rgb(s.backgroundColor).slice(0, 3).join() !== "255,255,255")
        out.push(`1: pole ${name(el)} nie je biele (${s.backgroundColor})`);
      const edge = contrast(s.borderTopColor, around);
      if (edge < 3) out.push(`1: okraj poľa ${name(el)} má ${edge.toFixed(2)} : 1`);
    }
    // Rule 1: no card in a card — an element with its own edge and background inside another such element.
    const isCard = (el) => {
      const s = getComputedStyle(el);
      return (
        s.borderTopWidth !== "0px" &&
        s.borderTopStyle !== "none" &&
        opaque(s.backgroundColor) &&
        el.offsetWidth > 200 &&
        el.offsetHeight > 60 &&
        !["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A", "TABLE"].includes(el.tagName) &&
        !el.closest("[role=dialog], [data-radix-popper-content-wrapper], [data-sonner-toaster]")
      );
    };
    const cards = [...document.querySelectorAll("main *")].filter(
      (el) => el.offsetParent && isCard(el),
    );
    let nested = 0;
    for (const el of cards) {
      let p = el.parentElement;
      while (p && p.tagName !== "MAIN") {
        if (isCard(p)) {
          const a = getComputedStyle(el).backgroundColor;
          const b = getComputedStyle(p).backgroundColor;
          if (a !== b) {
            nested++;
            if (nested <= 3)
              out.push(`1: karta v karte: ${name(el)}.${[...el.classList].slice(0, 3).join(".")}`);
          }
          break;
        }
        p = p.parentElement;
      }
    }
    // Rule 6: a field or button never leaves its card or row.
    for (const el of document.querySelectorAll(
      "main input:not([type=hidden]), main select, main textarea, main button",
    )) {
      // Hidden inputs of Radix checkboxes / switches sit off the control on purpose.
      if (el.offsetParent === null || el.getAttribute("aria-hidden") === "true") continue;
      if (getComputedStyle(el).opacity === "0") continue;
      const box = el.closest("form, li, section, [role=region], [role=row], .surface");
      if (!box || box.closest(".overflow-x-auto")) continue;
      const a = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (a.right > b.right + 1 || a.left < b.left - 1)
        out.push(`6: ${name(el)} pretečie svoj rámček`);
    }
    // Rule 8: the ⓘ right after the title in the administration and the control center.
    // Pomoc is the explanation itself — no ⓘ there.
    if (area !== "guest" && location.pathname !== "/admin/help") {
      const h1 = document.querySelector("main h1, h1");
      const tip = h1?.parentElement?.querySelector("[data-info-tip]");
      const inCard = document.querySelector("main [data-info-tip]");
      if (!tip && !inCard) out.push("8: chýba ⓘ za nadpisom");
    }
    return out;
  }, area);
}

async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `axe ${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

const report = [];
async function audit(page, area, base, [name, path], vp, fill) {
  if (ONLY && !ONLY.test(name)) return;
  const target = fill(path);
  const res = await page.goto(`${base}${target}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.mouse.move(VIEWPORTS[vp].width - 2, VIEWPORTS[vp].height - 2);
  await page.waitForTimeout(500);
  const findings = [
    ...(res && !res.ok() ? [`HTTP ${res.status()}`] : []),
    ...(await rules(page, area)),
    ...(await axe(page)),
  ];
  await page.screenshot({
    path: `${OUT}/${name}-${vp}.jpg`,
    type: "jpeg",
    quality: 62,
    fullPage: true,
  });
  report.push({ name, path: target, vp, findings });
  console.log(
    `${findings.length ? "✗" : "✓"} ${name}-${vp}${findings.length ? `: ${findings.join(" | ")}` : ""}`,
  );
}

async function staffContext(browser, vp, email, next) {
  const { width, height, ...rest } = VIEWPORTS[vp];
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...rest,
    locale: "sk-SK",
    timezoneId: "Europe/Bratislava",
  });
  await ctx.addCookies([{ name: "active_tenant", value: TENANT, url: ADMIN }]);
  const page = await ctx.newPage();
  const token = must(await db.auth.admin.generateLink({ type: "magiclink", email }), "link")
    .properties.hashed_token;
  await page.goto(`${ADMIN}/auth/confirm?token_hash=${token}&type=magiclink&next=${next}`);
  await page.waitForURL(new RegExp(next));
  return { ctx, page };
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const guestEmail = `ui-audit-${Date.now()}@booking-platform.test`;
let stayId = null;
try {
  // A confirmed stay of a test guest, 2 nights next spring, on free nights.
  const year = new Date().getUTCFullYear() + 1;
  const { data: busy } = await db.rpc("unit_busy_nights", {
    p_unit_id: UNIT,
    p_from: `${year}-03-01`,
    p_to: `${year}-06-30`,
  });
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
  for (let d = new Date(Date.UTC(year, 2, 1)); !checkIn; d.setUTCDate(d.getUTCDate() + 1)) {
    const days = [0, 1, 2, 3].map((i) =>
      new Date(d.getTime() + i * 864e5).toISOString().slice(0, 10),
    );
    if (days.every((x) => !taken.has(x))) checkIn = days[1];
  }
  const checkOut = new Date(Date.parse(checkIn) + 2 * 864e5).toISOString().slice(0, 10);
  const created = must(
    await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: PROPERTY,
          unit_id: UNIT,
          guest_name: "Kontrola Obrazoviek",
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
  const fill = (p) => p.replace("{stay}", stayId).replace("{token}", created.access_token ?? "");

  for (const vp of Object.keys(VIEWPORTS)) {
    const o = await staffContext(browser, vp, "qa@booking-platform.test", "/admin");
    for (const p of OWNER_PAGES) await audit(o.page, "admin", ADMIN, p, vp, fill);
    await o.ctx.close();

    const a = await staffContext(browser, vp, "qa-admin@booking-platform.test", "/platform");
    for (const p of PLATFORM_PAGES) await audit(a.page, "platform", ADMIN, p, vp, fill);
    await a.ctx.close();

    const { width, height, ...rest } = VIEWPORTS[vp];
    const g = await browser.newContext({ viewport: { width, height }, ...rest, locale: "sk-SK" });
    const gp = await g.newPage();
    await audit(gp, "guest", ADMIN, ["prihlasenie-majitel", "/login"], vp, fill);
    await audit(gp, "guest", GUEST, ["host-prihlasenie", "/ucet/prihlasenie"], vp, fill);
    await audit(gp, "guest", GUEST, GUEST_PAGES[0], vp, fill);
    await audit(gp, "guest", GUEST, GUEST_PAGES[1], vp, fill);
    await gp.goto(`${GUEST}/ucet/prihlasenie`);
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
    await gp.waitForURL(
      (u) => u.pathname.startsWith("/ucet") && !u.pathname.includes("prihlasenie"),
    );
    for (const p of GUEST_PAGES.slice(2)) await audit(gp, "guest", GUEST, p, vp, fill);
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
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.findings.length);
  writeFileSync(
    `${OUT}/report.md`,
    [
      `# Kontrola obrazoviek (Z61)`,
      ``,
      `${report.length} obrazoviek × zariadení, s nálezom ${bad.length}.`,
      ``,
      ...report.map(
        (r) =>
          `- ${r.findings.length ? "✗" : "✓"} **${r.name}** (${r.vp}) \`${r.path.replace(/[0-9a-f-]{36}/g, "…")}\`${r.findings.length ? ` — ${r.findings.join("; ")}` : ""}`,
      ),
      ``,
    ].join("\n"),
  );
}
