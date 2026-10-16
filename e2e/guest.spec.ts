import { expect, test } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { freeStay, pickStay, TEST_DOMAIN } from "./helpers";

test("guest books Chalet STRÖMY: calendar, 3-step cart, service, consents, payment details, cancellation request", async ({
  page,
}, info) => {
  const stay = await freeStay(3);
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chalet STRÖMY");

  // No horizontal scrolling (390 px on the phone project).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);

  // Dates in the page calendar open the cart (step 1).
  const calendar = page.locator("#termin");
  await calendar.scrollIntoViewIfNeeded();
  await pickStay(calendar, stay.checkIn, stay.checkOut);
  const cart = page.getByRole("dialog");
  await expect(cart).toBeVisible();
  await expect(cart).toContainText("Spolu");
  await expect(cart).toContainText("na osobu a noc");
  await cart.getByRole("button", { name: "Pokračovať" }).click();

  // Step 2: contact and a service.
  await cart.locator("#c-name").fill(`E2E ${info.project.name}`);
  await cart.locator("#c-email").fill(`e2e-${Date.now()}@${TEST_DOMAIN}`);
  await cart.locator("#c-phone").fill("+421900000000");
  const breakfast = cart.getByRole("button", { name: "Raňajky v chalete", exact: true });
  await breakfast.click();
  await expect(breakfast).toHaveAttribute("aria-pressed", "true");
  await cart.getByRole("button", { name: "K platbe" }).click();

  // Step 3: consents (marketing stays unchecked) and the binding button.
  await expect(cart.getByRole("checkbox", { name: /novinky/ })).not.toBeChecked();
  await cart.getByRole("checkbox", { name: /obchodnými podmienkami/ }).check();
  await cart.getByRole("checkbox", { name: /storno podmienky/ }).check();
  await page.waitForTimeout(3200); // the form refuses submissions faster than a human (bot protection)
  await cart.getByRole("button", { name: "Rezervovať s povinnosťou platby" }).click();

  // Reservation page via the secret link: payment details with QR.
  await page.waitForURL(/\/r\/[A-Za-z0-9_-]+/);
  await expect(page.getByText("Ďakujeme, rezervácia je prijatá.")).toBeVisible();
  await expect(page.getByText("Čaká na platbu").first()).toBeVisible();
  await expect(page.getByText("Variabilný symbol")).toBeVisible();
  await expect(page.getByText(/SK\d{2}/).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /PAY by square/ }).locator("svg")).toBeVisible();
  await expect(page.getByText("Raňajky v chalete").first()).toBeVisible();

  // The link works again later (no session needed).
  const link = page.url();
  await page.context().clearCookies();
  await page.goto(link);
  await expect(page.getByText("Variabilný symbol")).toBeVisible();

  // Cancellation request.
  await page.getByRole("button", { name: "Požiadať o zrušenie" }).click();
  await expect(page.getByText("Žiadosť o zrušenie sme odoslali")).toBeVisible();
});

test("calendar works with the keyboard", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "keyboard on desktop");
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  const day = page.locator("#termin button[data-date]:not([disabled])").first();
  await day.focus();
  await expect(day).toHaveAttribute("aria-label", /\d{4}/);
  await page.keyboard.press("Enter");
  await expect(day).toHaveAttribute("aria-pressed", "true");
});
