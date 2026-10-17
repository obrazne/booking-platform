import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, STROMY } from "./helpers";

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

test("menu with groups: group opens, the active page's group is open, collapsed rail", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  await page.goto(`${ADMIN_URL}/admin`);
  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("navigation", { name: "Hlavné menu" }).filter({ visible: true });
  if (!mobile) {
    // Collapsed rail: icons only, sub-items hidden until it expands on hover.
    await expect(menu.getByRole("link", { name: "Kalendár" })).toHaveCount(0);
    await page.locator("aside").hover();
  }
  const group = menu.getByRole("button", { name: /Rezervácie/ });
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await group.click();
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await menu.getByRole("link", { name: "Kalendár" }).click();
  await page.waitForURL(/\/admin\/calendar/);

  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  else await page.locator("aside").hover();
  const again = page.getByRole("navigation", { name: "Hlavné menu" }).filter({ visible: true });
  await expect(again.getByRole("button", { name: /Rezervácie/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(again.getByRole("link", { name: "Kalendár" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(again.getByRole("link", { name: "Štatistiky" })).toBeVisible();
  await expect(again.getByRole("button", { name: /Nastavenia/ })).toBeVisible();
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
    tenant_id: STROMY,
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
