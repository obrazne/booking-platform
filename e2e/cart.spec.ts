import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { freeStay, pickStay, service } from "./helpers";

// Cart v2.2 (Z29): on a 13″ notebook (1440 × 800) the green summary fits without scrolling.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
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
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  const calendar = page.locator("#termin");
  await calendar.scrollIntoViewIfNeeded();
  await pickStay(calendar, stay.checkIn, stay.checkOut);
  const cart = page.getByRole("dialog");

  // Step 1 starts with extras (the stay is not repeated on the left), no photo strip.
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await expect(cart.getByRole("button", { name: "Hotovo", exact: true })).toHaveCount(0);
  for (const name of ["Raňajky v chalete", "Privátny šéfkuchár — večera o 4 chodoch"]) {
    await cart.getByRole("button", { name, exact: true }).click();
  }
  await expect(cart.locator("aside").getByText("Vaše doplnky")).toBeVisible();
  await summaryFits(page, cart, "Pokračovať");

  // A row opens in place (one at a time).
  const chef = cart.getByRole("button", { name: /^Privátny šéfkuchár/ }).nth(1);
  await chef.click();
  await expect(chef).toHaveAttribute("aria-expanded", "true");
  await expect(cart.getByRole("button", { name: "Odobrať z pobytu" })).toBeVisible();

  // Zmeniť → calendar on the left, extras hidden, Pokračovať muted → Hotovo.
  await cart.locator("aside").getByRole("button", { name: "Zmeniť", exact: true }).click();
  await expect(cart.getByRole("button", { name: "Hotovo", exact: true })).toBeVisible();
  await expect(cart.getByText("K pobytu môžete pridať.")).toHaveCount(0);
  await expect(cart.locator("aside").getByRole("button", { name: "Pokračovať" })).toBeDisabled();
  await cart.getByRole("button", { name: "Hotovo", exact: true }).click();
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

  // Step 3: three reassurances above the consents, back to the details from the summary.
  await expect(cart.getByRole("heading", { name: /Skontrolujte a potvrďte/ })).toBeVisible();
  await expect(
    cart
      .getByRole("list")
      .filter({ hasText: /Storno/ })
      .first(),
  ).toBeVisible();
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
  await page.goto(`${GUEST_URL}/p/chalet-stromy`);
  const calendar = page.locator("#termin");
  await calendar.scrollIntoViewIfNeeded();
  await pickStay(calendar, stay.checkIn, stay.checkOut);
  const cart = page.getByRole("dialog");
  await expect(cart.getByText("K pobytu môžete pridať.")).toBeVisible();
  await expect(cart.locator("img")).toHaveCount(0);
  const row = cart.getByRole("button", { name: "Raňajky v chalete", exact: true });
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  const overflow = await cart.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  await noSeriousA11y(page);
});
