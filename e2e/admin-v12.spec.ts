import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import {
  PROPERTY_NAME,
  TENANT,
  TENANT_PROPERTY,
  loginOwner,
  markToursSeen,
  service,
} from "./helpers";

// Administration v1.2 (Z27): menu with groups, Statistics, notifications.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
});

test("menu with groups: a group opens its first page, only the active group is open", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const openMenu = async () => {
    if (mobile) await page.getByRole("button", { name: "Menu" }).click();
    else await page.locator("aside").hover();
    return page.getByRole("navigation", { name: "Hlavné menu" }).filter({ visible: true });
  };
  await page.goto(`${ADMIN_URL}/admin`);
  if (!mobile) {
    // Collapsed rail: icons only, sub-items hidden until it expands on hover.
    await expect(
      page.getByRole("navigation", { name: "Hlavné menu" }).getByRole("link", { name: "Kalendár" }),
    ).toHaveCount(0);
  }
  let menu = await openMenu();
  const group = menu.getByRole("link", { name: /^Rezervácie/ });
  await expect(group).toHaveAttribute("aria-expanded", "false");
  // Z69 (v1.7): no Prepojenia in the menu; Nastavenia is one item without sub-items (its parts are tabs).
  await expect(menu.getByRole("link", { name: "Prepojenia" })).toHaveCount(0);
  const settings = menu.getByRole("link", { name: "Nastavenia" });
  await expect(settings).toHaveAttribute("href", "/admin/settings");
  await expect(settings).not.toHaveAttribute("aria-expanded", /.*/);
  // Click on the group = its first page (Zoznam), the group expands.
  await group.click();
  await page.waitForURL(/\/admin\/reservations$/);
  menu = await openMenu();
  await expect(menu.getByRole("link", { name: /^Rezervácie/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(menu.getByRole("link", { name: /^Ponuka/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await menu.getByRole("link", { name: "Kalendár" }).click();
  await page.waitForURL(/\/admin\/calendar/);
  menu = await openMenu();
  await expect(menu.getByRole("link", { name: "Kalendár" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(menu.getByRole("link", { name: "Štatistiky" })).toBeVisible();
});

test("breadcrumbs: only from the second level, the parent on a phone", async ({ page }, info) => {
  const mobile = info.project.name === "mobile";
  await page.goto(`${ADMIN_URL}/admin/statistics`);
  await expect(page.getByRole("navigation", { name: "Drobčeková navigácia" })).toHaveCount(0);
  await page.goto(`${ADMIN_URL}/admin/settings/trash`);
  const crumbs = page.getByRole("navigation", { name: "Drobčeková navigácia" });
  if (mobile) {
    await expect(crumbs.getByRole("link", { name: "Späť na Nastavenia" })).toBeVisible();
  } else {
    await expect(crumbs.getByRole("link", { name: "Nastavenia" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    await expect(crumbs.getByText("Nedávno zmazané")).toHaveAttribute("aria-current", "page");
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/pricing`);
    const property = page.getByRole("navigation", { name: "Drobčeková navigácia" });
    await expect(property.getByRole("link", { name: "Objekt" })).toBeVisible();
    await expect(property.getByRole("link", { name: PROPERTY_NAME })).toBeVisible();
    await expect(property.locator('[aria-current="page"]').filter({ visible: true })).toContainText(
      /ceny/i,
    );
  }
});

test("statistics: year, comparison, click on a month", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/admin/statistics`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Štatistiky");
  const year = new Date().getFullYear();
  await page.getByRole("link", { name: String(year - 1), exact: true }).click();
  await page.waitForURL(new RegExp(`period=${year - 1}`));
  await expect(page.getByText(`Tržby priamo ${year - 1}`)).toBeVisible();

  const compare = page.getByRole("switch");
  if (await compare.count()) {
    const before = await compare.getAttribute("aria-checked");
    await compare.click();
    await expect(page.getByRole("switch")).not.toHaveAttribute("aria-checked", before!);
  }

  const month = page.getByRole("button", { name: new RegExp(`august ${year - 1}`, "i") });
  await month.click();
  await expect(month).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: /august/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /Graf tržieb po mesiacoch/ })).toBeVisible();
  await noSeriousA11y(page);
});

test("bell: badge, read on click and open the target, mark all as read", async ({ page }) => {
  const db = service();
  const key = `e2e:${Date.now()}`;
  await db.from("notifications").insert({
    tenant_id: TENANT,
    audience: "tenant",
    kind: "portal_booking",
    data: { channel: "E2E kanál", check_in: "2027-05-01", check_out: "2027-05-04" },
    target: "/admin/calendar?month=2027-05",
    dedupe_key: key,
  });

  await page.goto(`${ADMIN_URL}/admin`);
  const bell = page.getByRole("button", { name: /^Upozornenia/ }).filter({ visible: true });
  await expect(bell).toHaveAccessibleName(/neprečítané: \d+/);
  await bell.click();
  const list = page.getByRole("dialog", { name: "Upozornenia" });
  await expect(list).toBeVisible();
  await noSeriousA11y(page);
  const item = list.getByRole("button", { name: /E2E kanál obsadil termín/ });
  await expect(item).toContainText("neprečítané");
  await item.click();
  await page.waitForURL(/\/admin\/calendar\?month=2027-05/);

  await bell.click();
  await expect(list.getByRole("button", { name: /E2E kanál obsadil termín/ })).not.toContainText(
    "neprečítané",
  );
  const readAll = list.getByRole("button", { name: "Označiť všetko ako prečítané" });
  if (await readAll.count()) await readAll.click();
  await expect(bell).toHaveAccessibleName("Upozornenia");

  // Settings → E-maily a upozornenia lists what comes to the bell and what by e-mail.
  await page.goto(`${ADMIN_URL}/admin/settings/notifications`);
  await expect(page.getByRole("row", { name: /Nová rezervácia/ })).toContainText("áno");
  await db.from("notifications").delete().eq("dedupe_key", key);
});

test("calendar: a date closed on Booking is not shown as a stay (Z41)", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: closed } = await db
    .from("occupancy")
    .select("nights, unit_id")
    .eq("tenant_id", TENANT)
    .eq("kind", "ical")
    .like("label", "CLOSED%")
    .limit(1)
    .maybeSingle();
  test.skip(!closed, "no closed date — run npm run demo-data");
  const month = String(closed!.nights).slice(1, 8);
  await page.goto(`${ADMIN_URL}/admin/calendar?month=${month}&unit=${closed!.unit_id}`);
  const bar = page.getByRole("button", { name: /^Zavreté na Bookingu/ }).first();
  await expect(bar).toBeVisible();
  await bar.click();
  await expect(page.getByText(/podrobnosti sú v extranete Bookingu/)).toBeVisible();
});
