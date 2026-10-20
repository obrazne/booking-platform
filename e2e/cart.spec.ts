import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { PROPERTY_SLUG, freeStay, pickStay, service } from "./helpers";

// Cart v2.2 (Z29): on a 13″ notebook (1440 × 800) the green summary fits without scrolling.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

/** Clicks one day in a calendar, paging months forward as needed. */
async function pickDay(scope: Locator, date: string) {
  for (let i = 0; i < 24; i++) {
    const day = scope.locator(`button[data-date="${date}"]`).filter({ visible: true });
    if ((await day.count()) > 0) return day.first().click();
    await scope
      .getByRole("button", { name: "Nasledujúci mesiac" })
      .filter({ visible: true })
      .first()
      .click();
  }
}

/** The summary column does not scroll, and its button and reassurance line are inside the window. */
async function summaryFits(page: Page, cart: Locator, button: string) {
  const aside = cart.locator("aside");
  const scrolls = await aside
    .locator("> div")
    .first()
    .evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  expect(scrolls).toBe(false);
  const height = page.viewportSize()!.height;
  const cta = aside.getByRole("button", { name: button });
  await expect(cta).toBeVisible();
  expect((await cta.boundingBox())!.y + (await cta.boundingBox())!.height).toBeLessThanOrEqual(
    height,
  );
  // Z71: on the payment step the cancellation is said once — at its checkbox, not under the button.
  if (button === "Rezervovať s povinnosťou platby") {
    await expect(aside.getByText(/Storno/)).toHaveCount(0);
    return;
  }
  const trust = aside.getByText(/Storno/).last();
  await expect(trust).toBeVisible();
  expect((await trust.boundingBox())!.y).toBeLessThan(height);
}

test("cart v2.2 on a 13″ notebook: summary without scrolling, one-line extras, Zmeniť, steps", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "notebook layout");
  await page.setViewportSize({ width: 1440, height: 800 });
  const stay = await freeStay(3);
  await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
  const calendar = page.locator("#termin");
  await calendar.scrollIntoViewIfNeeded();
  await pickStay(calendar, stay.checkIn, stay.checkOut);
  const cart = page.getByRole("dialog");

  // Step 1 starts with extras (the stay is not repeated on the left), no photo strip.
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await expect(cart.getByRole("button", { name: "Potvrdiť termín" })).toHaveCount(0);
  for (const name of ["Raňajky", "Požičanie bicyklov"]) {
    await cart.getByRole("button", { name, exact: true }).click();
  }
  await expect(cart.locator("aside").getByText("Vaše doplnky")).toBeVisible();
  await summaryFits(page, cart, "Pokračovať");

  // A row opens in place (one at a time).
  const bikes = cart.getByRole("button", { name: /^Požičanie bicyklov/ }).nth(1);
  await bikes.click();
  await expect(bikes).toHaveAttribute("aria-expanded", "true");
  await expect(cart.getByRole("button", { name: "Odobrať z pobytu" })).toBeVisible();

  // Zmeniť → calendar on the left, extras hidden, Zmeniť itself hidden → Potvrdiť termín.
  await cart.locator("aside").getByRole("button", { name: "Zmeniť", exact: true }).click();
  await expect(cart.getByRole("button", { name: "Potvrdiť termín" })).toBeVisible();
  await expect(cart.getByText("K pobytu môžete pridať.")).toHaveCount(0);
  await expect(
    cart.locator("aside").getByRole("button", { name: "Zmeniť", exact: true }),
  ).toHaveCount(0);
  await cart.getByRole("button", { name: "Potvrdiť termín" }).click();
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();

  // Step 2: the owner's card; the finished step 1 leads back from the step bar.
  await cart.locator("aside").getByRole("button", { name: "Pokračovať" }).click();
  await expect(cart.getByText(/Otázky pred rezerváciou\? Odpovedá/)).toBeVisible();
  await summaryFits(page, cart, "Skontrolovať a zaplatiť");
  await cart.getByRole("button", { name: /Váš pobyt/ }).click();
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await cart.locator("aside").getByRole("button", { name: "Pokračovať" }).click();
  await cart.locator("#c-name").fill("E2E Notebook");
  await cart.locator("#c-email").fill(`e2e-notebook-${Date.now()}@booking-platform.test`);
  await cart.locator("aside").getByRole("button", { name: "Skontrolovať a zaplatiť" }).click();

  // Step 3 (Z71): the way to pay as cards, the cancellation said once (at its checkbox), back to the details.
  await expect(cart.getByRole("heading", { name: /Skontrolujte a potvrďte/ })).toBeVisible();
  await expect(cart.getByRole("group", { name: "Spôsob platby" })).toBeVisible();
  await expect(cart.getByText(/Storno podľa podmienok/).filter({ visible: true })).toHaveCount(0);
  await expect(cart.locator("aside").getByRole("button", { name: /Späť na údaje/ })).toBeVisible();
  await summaryFits(page, cart, "Rezervovať s povinnosťou platby");
  await noSeriousA11y(page);
  // Release the hold of step 3 (at most 3 per unit).
  await service()
    .from("occupancy")
    .delete()
    .eq("kind", "hold")
    .eq("nights", `[${stay.checkIn},${stay.checkOut})`);
});

test("cart v2.2 on a phone: no photos, one-line extras, no sideways scrolling", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "phone layout");
  const stay = await freeStay(3);
  await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
  const calendar = page.locator("#termin");
  await calendar.scrollIntoViewIfNeeded();
  await pickStay(calendar, stay.checkIn, stay.checkOut);
  const cart = page.getByRole("dialog");
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await expect(cart.locator("img")).toHaveCount(0);
  const row = cart.getByRole("button", { name: "Raňajky", exact: true });
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  const overflow = await cart.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  await noSeriousA11y(page);
});

test("cart Z30: the reason above Pokračovať, active right after a valid stay", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "notebook layout");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
  await page.getByRole("button", { name: "Pozrieť pobyt" }).first().click();
  const cart = page.getByRole("dialog");
  const aside = cart.locator("aside");
  const next = aside.getByRole("button", { name: "Pokračovať" });
  await expect(aside.getByText("Vyberte deň príchodu")).toBeVisible();
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveAttribute("aria-describedby", "cart-reason");
  await next.click({ force: true }); // muted (aria-disabled), but points to the reason; nothing else happens
  await expect(cart.getByRole("button", { name: "Potvrdiť termín" })).toBeVisible();

  // Arrival chosen → the sentence moves on to the departure. (The calendar itself does not offer a departure that
  // breaks the minimum stay, so the price-rule sentence is a fallback.)
  const stay = await freeStay(3);
  await pickDay(cart, stay.checkIn);
  await expect(aside.getByText("Vyberte deň odchodu")).toBeVisible();
  await pickDay(cart, stay.checkOut);
  await expect(next).not.toHaveAttribute("aria-disabled", "true");
  await expect(aside.locator("#cart-reason")).toHaveCount(0);
  // Short dates in the summary (no wrapping); the reassurance line is not cut off.
  await expect(
    aside.getByText(/\d+\.\s*(\d+\.\s*)?–\s*\d+\.\s*\d+\.\s*\d{4}/).first(),
  ).toBeVisible();
  const trust = aside.getByText(/Storno/).last();
  const box = (await trust.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await next.click();
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await noSeriousA11y(page);
});
