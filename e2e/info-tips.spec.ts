import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, loginOwner, loginPlatformAdmin, markToursSeen } from "./helpers";

// Explanations ⓘ (Z66, docs/pravidla-rozhrania.md rule 8, doska 14): every page of the administration and the control
// center has an ⓘ right after its title; closed by default, opens under the mouse, on keyboard focus and on a tap, a
// click keeps it open, Esc or a click outside closes it; the text is the button's description for screen readers.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

/** The ⓘ next to the page title (same row as the h1). */
const pageTip = (page: Page) =>
  page.locator("h1").first().locator("xpath=..").locator("[data-info-tip]").first();

const OWNER_PAGES = [
  "/admin",
  "/admin/calendar",
  "/admin/reservations",
  "/admin/reservations/new",
  "/admin/portal-stays",
  "/admin/collisions",
  "/admin/blocks",
  "/admin/settings?tab=prepojenia",
  "/admin/messages",
  "/admin/messages/auto",
  "/admin/reviews",
  "/admin/services",
  "/admin/testimonials",
  "/admin/statistics",
  "/admin/statistics/report",
  "/admin/settings?tab=tim",
  "/admin/settings",
  "/admin/settings?tab=upozornenia",
  "/admin/settings?tab=platby",
  "/admin/settings?tab=pravidla",
  "/admin/settings?tab=vypis",
  "/admin/settings/trash",
  "/admin/guests",
  "/admin/properties",
  `/admin/properties/${TENANT_PROPERTY}`,
  `/admin/properties/${TENANT_PROPERTY}/pricing`,
  `/admin/properties/${TENANT_PROPERTY}/documents`,
];

const PLATFORM_PAGES = [
  "/platform",
  "/platform/new",
  "/platform/audit",
  "/platform/modules",
  "/platform/modules/trials",
  "/platform/status",
  "/platform/notifications",
  "/platform/support",
  `/platform/tenants/${TENANT}`,
  `/platform/tenants/${TENANT}/modules`,
  `/platform/tenants/${TENANT}/audit`,
];

test("every owner page has an ⓘ after the title", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  for (const path of OWNER_PAGES) {
    await page.goto(`${ADMIN_URL}${path}`);
    // reservations/new has the title in a card, not an h1.
    const tip =
      path === "/admin/reservations/new"
        ? page.locator("main [data-info-tip]").first()
        : pageTip(page);
    await expect(tip, path).toBeVisible();
    await expect(tip, path).toHaveAttribute("aria-label", /^Vysvetlivka: /);
  }
  // A property tab explains the tab that is open.
  await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/pricing`);
  await expect(pageTip(page)).toHaveAttribute("aria-label", "Vysvetlivka: Sezóny a ceny");
});

test("every control center page has an ⓘ after the title", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await loginPlatformAdmin(page, ADMIN_URL);
  for (const path of PLATFORM_PAGES) {
    await page.goto(`${ADMIN_URL}${path}`);
    await expect(pageTip(page), path).toBeVisible();
  }
  await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}/audit`);
  await expect(pageTip(page)).toHaveAttribute("aria-label", "Vysvetlivka: Čo je Záznam zmien");
});

test("ⓘ: mouse, keyboard, click keeps it, Esc closes; link to Pomoc; field ⓘ", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "the phone has its own test");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/blocks`);
  const tip = pageTip(page);
  const title = page.getByText("Čo je blokácia", { exact: true });
  await expect(title).toBeHidden();
  // The text is the button's description, also when closed.
  const describedBy = await tip.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${describedBy}"]`)).toContainText("Zavrie termín");

  // Under the mouse: opens; away: closes.
  await tip.hover();
  await expect(title).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(title).toBeHidden();

  // A click keeps it open, Esc closes.
  await tip.click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await expect(title).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(title).toBeHidden();

  // Keyboard focus opens it; Tab goes on to the link to Pomoc.
  await tip.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(title).toBeVisible();
  const more = page.getByRole("link", { name: "Ako blokovať termín ›" });
  await expect(more).toHaveAttribute("href", "/admin/help?open=blockDates");
  await noSeriousA11y(page);

  // A click outside closes a kept one.
  await tip.click();
  await expect(title).toBeVisible();
  await page.locator("main").click({ position: { x: 5, y: 300 } });
  await expect(title).toBeHidden();

  // Smaller ⓘ at a field: "Do (deň odchodu)".
  await page.getByRole("button", { name: "Pridať blokáciu" }).click();
  const field = page.getByRole("button", { name: "Vysvetlivka: Do (deň odchodu)" });
  await field.click();
  await expect(page.locator("[data-info-tip-content]")).toContainText(
    "8. apríla už môže prísť hosť",
  );
});

test("ⓘ on a phone: a tap opens, a tap outside closes", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "touch");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/blocks`);
  const title = page.getByText("Čo je blokácia", { exact: true });
  await pageTip(page).tap();
  await expect(title).toBeVisible();
  const box = await title.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  await page.locator("main").tap({ position: { x: 10, y: 400 } });
  await expect(title).toBeHidden();
});
