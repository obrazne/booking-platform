import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import {
  freeStay,
  loginOwner,
  loginPlatformAdmin,
  markToursSeen,
  STROMY,
  TEST_DOMAIN,
} from "./helpers";

// Administration and logins by the approved visual v1 (Z23): computer and 390 px, accessibility (axe).
test.describe.configure({ mode: "serial" });

async function serious(page: Page, label: string, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const result = await builder.analyze();
  const lines = result.violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target.join(" ")}`,
  );
  console.log(`[a11y] ${label}: ${lines.length ? "\n  " + lines.join("\n  ") : "bez nálezov"}`);
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => v.id);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("01 login: split screen, sign-in link never reveals whether the account exists", async ({
  page,
}) => {
  await page.goto(`${ADMIN_URL}/login`);
  await expect(page.getByRole("heading", { name: "Vitajte späť." })).toBeVisible();
  await page.getByLabel("E-mail").fill(`nikto-${Date.now()}@${TEST_DOMAIN}`);
  await page.getByRole("button", { name: "Poslať prihlasovací odkaz na e-mail" }).click();
  await expect(page.getByRole("status")).toContainText("Ak k tomuto e-mailu existuje účet");
  expect.soft(await serious(page, "prihlásenie")).toEqual([]);
  await noHorizontalScroll(page);
});

test("02 overview, 03 reservations with the panel, 04 calendar", async ({ page }, info) => {
  const mobile = info.project.name === "mobile";
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);

  // 02 Overview: greeting, four numbers, upcoming stays, occupancy.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dobr(é|ý)/);
  await expect(page.getByText("Ušetrené na províziách")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Najbližšie pobyty" })).toBeVisible();
  expect.soft(await serious(page, "prehľad")).toEqual([]);
  await noHorizontalScroll(page);

  // 03 Reservations: open a row, switch to another one, close by Esc / click beside.
  await page.goto(`${ADMIN_URL}/admin/reservations`);
  const rows = page.locator('[role="table"] a[role="row"]');
  await expect(rows.nth(1)).toBeVisible();
  const firstNumber = (await rows.nth(0).locator('[role="cell"]').first().textContent())!.trim();
  const secondNumber = (await rows.nth(1).locator('[role="cell"]').first().textContent())!.trim();
  await rows.nth(0).click();
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText(firstNumber);
  await page.waitForTimeout(400); // slide-in animation (fading text would count as low contrast)
  expect.soft(await serious(page, "panel rezervácie", "[role=dialog]")).toEqual([]);
  if (!mobile) {
    // The list stays usable: another row switches the record, the panel stays open.
    // Left part of the row — the right part is under the panel.
    await rows.nth(1).click({ position: { x: 40, y: 20 } });
    await expect(panel).toContainText(secondNumber);
    await expect(rows.nth(1)).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await rows.nth(0).click();
    await expect(panel).toBeVisible();
    await page.getByRole("heading", { level: 1, name: "Rezervácie" }).click();
    await expect(panel).toBeHidden();
  } else {
    // Phone (07): full screen with "‹ Rezervácie".
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(390);
    await panel.getByRole("button", { name: "Rezervácie" }).click();
    await expect(panel).toBeHidden();
  }
  await page.getByRole("button", { name: /^Zaplatené/ }).click();
  await expect(page).toHaveURL(/status=confirmed/);

  // 04 Calendar: pick arrival and departure in free days → "Nový termín" with the price.
  const stay = await freeStay(3);
  await page.goto(`${ADMIN_URL}/admin/calendar?month=${stay.checkIn.slice(0, 7)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Kalendár" })).toBeVisible();
  const day = (d: string) => page.locator(`button[data-cal-day="${d}"]`).filter({ visible: true });
  await day(stay.checkIn).click();
  await expect(page.getByText(/teraz kliknite na deň odchodu/)).toBeVisible();
  // Keyboard: the departure is reached with the arrow keys and Enter.
  await day(stay.checkIn).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  if ((await day(stay.checkOut).count()) > 0) await page.keyboard.press("Enter");
  else await page.locator(`button[data-cal-day="${stay.checkOut}"]`).first().click();
  const newStay = page.getByRole("dialog");
  await expect(newStay).toContainText("Nový termín");
  await expect(newStay).toContainText("Cena podľa cenníka");
  await page.waitForTimeout(400);
  await expect(newStay.getByRole("link", { name: "Vytvoriť ručnú rezerváciu" })).toHaveAttribute(
    "href",
    new RegExp(`check_in=${stay.checkIn}&check_out=${stay.checkOut}`),
  );
  expect.soft(await serious(page, "kalendár")).toEqual([]);
  await noHorizontalScroll(page);
});

test("05 control center: own menu, clients, client panel without guest data", async ({
  page,
}, info) => {
  await loginPlatformAdmin(page, ADMIN_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Klienti" })).toBeVisible();
  if (info.project.name !== "mobile") {
    // Own menu: no accommodation picker.
    await expect(page.locator("aside")).not.toContainText("Ubytovanie");
  }
  await page
    .locator(`a[href*="panel=tenant%3A${STROMY}"], a[href*="panel=tenant:${STROMY}"]`)
    .click();
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText("Chalet STRÖMY");
  await expect(panel).toContainText("Balík a moduly");
  await expect(page.getByText("Riadiace centrum nevidí mená ani kontakty hostí")).toBeVisible();
  expect.soft(await serious(page, "riadiace centrum")).toEqual([]);
  await noHorizontalScroll(page);
});

test("08 guest login: client theme, code boxes after the e-mail", async ({ page }) => {
  await page.goto(`${GUEST_URL}/ucet/prihlasenie`);
  await expect(page.getByRole("heading", { name: "Vaše pobyty na jednom mieste." })).toBeVisible();
  expect.soft(await serious(page, "prihlásenie hosťa")).toEqual([]);
  await noHorizontalScroll(page);
});
