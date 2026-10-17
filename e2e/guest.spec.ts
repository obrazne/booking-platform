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
  if (info.project.name === "desktop") {
    // Green summary: total for the nights and the price per person and night.
    await expect(cart).toContainText("Spolu za 3 noci");
    await expect(cart).toContainText("na osobu a noc");
  } else {
    // Phones: the cart covers the whole screen, the green bar shows the sum; the breakdown slides up.
    expect((await cart.boundingBox())!.width).toBeGreaterThanOrEqual(389);
    await cart.getByRole("button", { name: /Rozpis a podmienky/ }).click();
    await expect(cart.getByRole("definition").first()).toContainText("€");
    await cart.getByRole("button", { name: /Rozpis a podmienky/ }).click();
  }
  // Step 1 (v2): extras as rows right under the dates.
  const breakfast = cart.getByRole("button", { name: "Raňajky v chalete", exact: true });
  await breakfast.click();
  await expect(breakfast).toHaveAttribute("aria-pressed", "true");
  await expect(cart.getByText("Vaše doplnky").first()).toBeAttached();
  await cart.getByRole("button", { name: "Pokračovať" }).click();

  // Step 2: contact.
  await cart.locator("#c-name").fill(`E2E ${info.project.name}`);
  await cart.locator("#c-email").fill(`e2e-${Date.now()}@${TEST_DOMAIN}`);
  await cart.locator("#c-phone").fill("+421900000000");
  await expect(cart.getByText("Raňajky v chalete").filter({ visible: true }).first()).toBeVisible();
  await cart
    .getByRole("button", { name: "Skontrolovať a zaplatiť" })
    .filter({ visible: true })
    .click();

  // Step 3: consents (marketing stays unchecked) and the binding button.
  await expect(cart.getByRole("checkbox", { name: /novinky/ })).not.toBeChecked();
  await cart.getByRole("checkbox", { name: /obchodnými podmienkami/ }).check();
  await cart.getByRole("checkbox", { name: /storno podmienky/ }).check();
  // The signed form token arrives with step 3 (the button is enabled then); the form refuses submissions
  // faster than a human from that moment (bot protection), so count the 3 s from there.
  const submit = cart.getByRole("button", { name: "Rezervovať s povinnosťou platby" });
  await expect(submit).toBeEnabled();
  await page.waitForTimeout(3200);
  await submit.click();

  // Reservation page via the secret link: payment details with QR.
  await page.waitForURL(/\/r\/[A-Za-z0-9_-]+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Termín vám držíme");
  await expect(page.getByText("Čaká na platbu").first()).toBeVisible();
  await expect(page.getByText("Variabilný symbol")).toBeVisible();
  await expect(page.getByText(/SK\d{2}/).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /PAY by square/ }).locator("svg")).toBeVisible();
  await expect(page.getByText("Raňajky v chalete").filter({ visible: true }).first()).toBeVisible();

  // The link works again later (no session needed).
  const link = page.url();
  await page.context().clearCookies();
  await page.goto(link);
  await expect(page.getByText("Variabilný symbol")).toBeVisible();

  // Cancellation request.
  await page.getByRole("button", { name: "Požiadať o zrušenie" }).click(); // opens the form
  await page.getByRole("button", { name: "Požiadať o zrušenie" }).click(); // sends it
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

test("v2 windows: gallery levels, Back closes one level, dates and next free stay open the cart", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "desktop layout");
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  const scrollBefore = await page.evaluate(() => window.scrollY);

  // Gallery: photo on the page → window with albums → big photo; Esc and Back close one level each.
  await page
    .locator("main")
    .getByRole("button", { name: /Chalet STRÖMY večer/ })
    .first()
    .click();
  const gallery = page.getByRole("dialog");
  await expect(gallery.getByRole("button", { name: /Všetky · \d+/ })).toBeVisible();
  await gallery.getByRole("button", { name: /Sauna/ }).first().click();
  await expect(gallery.getByRole("button", { name: "Všetky fotky" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gallery.getByRole("button", { name: "Všetky fotky" })).toHaveCount(0);
  await expect(gallery).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Arrival | Departure in the green panel opens the cart with the calendar — the page does not scroll.
  await page.getByRole("button", { name: "Vybrať termín" }).first().click();
  const cart = page.getByRole("dialog");
  await expect(cart.getByRole("button", { name: "Nasledujúci mesiac" }).first()).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  // After choosing both days the calendar stays open (the guest sees the range); hiding it is the guest's choice.
  const stay = await freeStay(3);
  await pickStay(cart, stay.checkIn, stay.checkOut);
  await expect(cart.getByRole("button", { name: "Potvrdiť termín" })).toBeVisible();
  await expect(cart.locator(`button[data-date="${stay.checkIn}"]`).first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Z30: a valid stay makes Pokračovať active at once — it confirms the dates and shows the extras.
  await expect(cart.getByRole("button", { name: "Pokračovať" })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await cart.getByRole("button", { name: "Pokračovať" }).click();
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await expect(cart.getByRole("button", { name: "Zmeniť", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Nearest free stay (computed on the server) opens the cart with those dates.
  await page.getByRole("button", { name: /Najbližší voľný termín/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Zmeniť", exact: true }),
  ).toBeVisible();
});

test("surroundings map is interactive (OpenStreetMap, zoom buttons)", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "desktop");
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  await page.locator("#okolie").scrollIntoViewIfNeeded();
  const map = page.locator("#okolie").getByRole("region", { name: /Mapa/ });
  await expect(map.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 20_000 });
  await expect(map.getByRole("button", { name: "Priblížiť" })).toBeVisible();
});
