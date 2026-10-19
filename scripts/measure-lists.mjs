// Load times of long lists (Z63): median of 5 loads of each page, server-rendered, after one warm-up.
//   npm run e2e:server ; node scripts/measure-lists.mjs
// Staging only; signs in with the QA test accounts (owner of the demo client, platform admin).
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (/prod/i.test(url)) throw new Error("Staging only");
const db = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const BASE = "http://localhost:3100";
const DEMO = "a0000000-0000-4000-8000-000000000001";
const STROMY = "a0000000-0000-4000-8000-000000000002";

async function signedIn(browser, email, next) {
  const ctx = await browser.newContext({ locale: "sk-SK" });
  await ctx.addCookies([{ name: "active_tenant", value: DEMO, url: BASE }]);
  const page = await ctx.newPage();
  const token = (await db.auth.admin.generateLink({ type: "magiclink", email })).data.properties
    .hashed_token;
  await page.goto(`${BASE}/auth/confirm?token_hash=${token}&type=magiclink&next=${next}`);
  await page.waitForURL(new RegExp(next));
  return page;
}

async function time(page, path) {
  const runs = [];
  await page.goto(`${BASE}${path}`);
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    runs.push(Date.now() - t0);
    if (!res?.ok()) throw new Error(`${path}: ${res?.status()}`);
  }
  runs.sort((a, b) => a - b);
  const html = (await page.content()).length;
  console.log(
    `${path.padEnd(60)} ${String(runs[2]).padStart(5)} ms   HTML ${(html / 1024).toFixed(0)} kB`,
  );
}

const browser = await chromium.launch();
const admin = await signedIn(browser, "qa-admin@booking-platform.test", "/platform");
await time(admin, `/platform/tenants/${STROMY}/audit`);
await time(admin, "/platform/audit");
await time(admin, "/platform");
const owner = await signedIn(browser, "qa@booking-platform.test", "/admin");
await time(owner, "/admin/reservations");
await time(owner, "/admin/portal-stays");
await time(owner, "/admin/messages");
await time(owner, "/admin/reviews");
await browser.close();
