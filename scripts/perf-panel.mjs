// Time from a click on a reservation row to the side panel: visible shell and full detail (Z26).
// Usage: node scripts/perf-panel.mjs [base-url]   (default http://localhost:3100; server against STAGING)
// Signs in the QA owner through a one-time link (staging only — never production).
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

process.loadEnvFile(".env.local");
const base = process.argv[2] ?? "http://localhost:3100";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const { data: link, error } = await db.auth.admin.generateLink({
  type: "magiclink",
  email: "qa@booking-platform.test",
});
if (error) throw error;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page
  .context()
  .addCookies([
    { name: "active_tenant", value: "a0000000-0000-4000-8000-000000000002", url: base },
  ]);
await page.goto(
  `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/admin/reservations`,
);
await page.waitForURL(/\/admin\/reservations/);
await page.keyboard.press("Escape"); // tour window, if any
const rows = page.locator('[role="table"] a[role="row"]');
await rows.nth(2).waitFor();

const results = [];
for (let i = 0; i < 4; i++) {
  const row = rows.nth(i % 3);
  const number = (await row.locator('[role="cell"]').first().textContent()).trim();
  await page.keyboard.press("Escape");
  await page
    .getByRole("dialog")
    .waitFor({ state: "hidden" })
    .catch(() => {});
  const t0 = Date.now();
  await row.click({ position: { x: 30, y: 20 } });
  await page.getByRole("dialog").waitFor();
  const shell = Date.now() - t0;
  await page.getByRole("dialog").getByText(number).first().waitFor();
  await page.getByRole("dialog").getByText("Rozpis ceny").waitFor();
  const full = Date.now() - t0;
  results.push({ number, shell, full });
}
console.table(results);
await browser.close();
