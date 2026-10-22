import AxeBuilder from "@axe-core/playwright";
import { createServer } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { PROPERTY_SLUG, TENANT, TENANT_PROPERTY, freeStay, pickStay, service } from "./helpers";

// Widget "kalendár s cenami" on the client's website (Z83): a test page on an allowed website with the one-line code
// shows the calendar in a frame; choosing dates → "Pokračovať na rezerváciu" opens the property page in the main window
// with the dates and the cart open; the view and the click are counted; a website that is not allowed gets no calendar
// (frame-ancestors). PC and phone. Demo client only; its list of websites is put back at the end.

const PORT = 4100;
const ALLOWED = `http://web-klienta.localhost:${PORT}`;
const FOREIGN = `http://cudzi-web.localhost:${PORT}`;
const db = service();
const widgetJs = `${GUEST_URL}/widget.js`;

/** The client's website: a real local server (so the browser treats it like any site next to the app). */
const site = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Web klienta</title></head>
<body style="margin:0;padding:16px;font-family:sans-serif;background:#f3efe6"><main><h1>Chalet na webe klienta</h1>
<div data-booking-widget="kalendar" data-objekt="${PROPERTY_SLUG}"${req.url?.startsWith("/info") ? ' data-rezim="info"' : ""}></div><script src="${widgetJs}" async></script>
</main></body></html>`);
});

async function clientPage(page: Page, origin: string) {
  await page.goto(`${origin}/ubytovanie`);
}

async function counts() {
  const { data } = await db
    .from("widget_stats")
    .select("views, continues")
    .eq("tenant_id", TENANT)
    .eq("property_id", TENANT_PROPERTY);
  return (data ?? []).reduce(
    (s, r) => ({ views: s.views + r.views, continues: s.continues + r.continues }),
    { views: 0, continues: 0 },
  );
}

let original: string[] = [];

test.beforeAll(async () => {
  await new Promise<void>((done) => site.listen(PORT, "127.0.0.1", done));
  const { data } = await db
    .from("tenant_settings")
    .select("widget_sites")
    .eq("tenant_id", TENANT)
    .single();
  original = data?.widget_sites ?? [];
  await db
    .from("tenant_settings")
    .update({ widget_sites: [...new Set([...original, ALLOWED])] })
    .eq("tenant_id", TENANT);
});

test.afterAll(async () => {
  site.close();
  await db.from("tenant_settings").update({ widget_sites: original }).eq("tenant_id", TENANT);
});

test("widget on the client's website: dates → Pokračovať → cart with the dates", async ({
  page,
}) => {
  test.slow();
  const before = await counts();
  const stay = await freeStay(3);
  await clientPage(page, ALLOWED);

  const frameEl = page.locator('iframe[title="Kalendár s cenami"]');
  await expect(frameEl).toBeVisible();
  const frame = page.frameLocator('iframe[title="Kalendár s cenami"]');
  const root = frame.locator("[data-booking-widget-root]");
  await expect(root).toBeVisible();
  // The frame takes the height of the widget (no inner scrollbar).
  await expect.poll(async () => (await frameEl.boundingBox())!.height).toBeGreaterThan(400);
  await expect
    .poll(async () => {
      const inner = await root.evaluate((el) => el.getBoundingClientRect().height);
      return Math.abs((await frameEl.boundingBox())!.height - Math.ceil(inner));
    })
    .toBeLessThan(3);
  // No sideways scrolling on the phone.
  expect(await frame.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(
    true,
  );

  const go = frame.getByRole("link", { name: "Pokračovať na rezerváciu" });
  await expect(go).toHaveAttribute("aria-disabled", "true");
  await pickStay(root, stay.checkIn, stay.checkOut);
  await expect(frame.locator("[data-widget-summary]")).toHaveText(/^3 noci · .+€$/);
  await frame.getByRole("button", { name: "Viac: Deti" }).click();
  await expect(go).toHaveAttribute("aria-disabled", "false");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(
    axe.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);

  // The main window goes to the booking page with the dates; the cart is open.
  await go.click();
  await page.waitForURL(
    new RegExp(
      `/p/${PROPERTY_SLUG}\\?check_in=${stay.checkIn}&check_out=${stay.checkOut}&adults=2&children=1&utm_source=web-klienta`,
    ),
  );
  expect(new URL(page.url()).origin).toBe(new URL(GUEST_URL).origin);
  await expect(page.getByRole("dialog").getByText("K pobytu môžete pridať.")).toBeVisible();

  // The view and the click are counted.
  await expect
    .poll(async () => {
      const after = await counts();
      return after.views > before.views && after.continues > before.continues;
    })
    .toBe(true);
});

test("widget only to look at (data-rezim=info): calendar, legend, price of the nights, nothing to order", async ({
  page,
}) => {
  const stay = await freeStay(3);
  await page.goto(`${ALLOWED}/info`);
  const frame = page.frameLocator('iframe[title="Kalendár s cenami"]');
  const root = frame.locator("[data-booking-widget-root]");
  await expect(root).toBeVisible();
  await expect(root.getByText(/Leto · /)).toBeVisible();
  for (const text of [
    "Vyberte deň príchodu.",
    "Dospelí",
    "Pokračovať na rezerváciu",
    "Rezerváciu dokončíte",
  ])
    await expect(root.getByText(text)).toHaveCount(0);
  // Choosing nights shows their price; still nothing to order.
  await pickStay(root, stay.checkIn, stay.checkOut);
  await expect(frame.locator("[data-widget-summary]")).toHaveText(/^3 noci · .+€$/);
  await expect(root.getByRole("link")).toHaveCount(0);
  await expect(root.getByRole("button", { name: "Zrušiť výber" })).toBeVisible();
});

test("widget on a website the client did not allow: no calendar", async ({ page }) => {
  const response = page.waitForResponse((r) => r.url().includes("/embed/kalendar"));
  await clientPage(page, FOREIGN);
  const csp = (await response).headers()["content-security-policy"] ?? "";
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain(ALLOWED);
  expect(csp).not.toContain(FOREIGN);
  expect((await response).headers()["set-cookie"]).toBeUndefined();
  await page.waitForTimeout(1000);
  const loaded = await Promise.all(
    page
      .frames()
      .filter((f) => f !== page.mainFrame())
      .map((f) =>
        f
          .locator("[data-booking-widget-root]")
          .count()
          .catch(() => 0),
      ),
  );
  expect(loaded.reduce((a, b) => a + b, 0)).toBe(0);
});

test("other pages are never in a frame; the widget page has no cookies", async ({ page }) => {
  for (const path of [`/p/${PROPERTY_SLUG}`, "/", "/ucet/prihlasenie"]) {
    const r = await page.goto(`${GUEST_URL}${path}`);
    expect(r!.headers()["x-frame-options"], path).toBe("DENY");
  }
  const embed = await page.goto(`${GUEST_URL}/embed/kalendar?objekt=${PROPERTY_SLUG}`);
  expect(embed!.headers()["x-frame-options"]).toBeUndefined();
  expect(embed!.headers()["set-cookie"]).toBeUndefined();
  expect((await page.context().cookies()).length).toBe(0);
});
