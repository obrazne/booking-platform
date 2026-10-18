import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, openWhatsNew, service } from "./helpers";

test("what's new: opens once for a new version, Next / Back / Esc, again from the menu", async ({
  page,
}, info) => {
  const db = service();
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const qa = list.users.find((u) => u.email === "qa@booking-platform.test");
  if (qa) await db.from("profiles").update({ tours_seen: {} }).eq("id", qa.id);

  await loginOwner(page, ADMIN_URL);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Správy s hosťom");
  // The demo client has messages, check-in, upsell and reviews on — all 20 slides (others skip module slides).
  await expect(dialog).toContainText("1 z 20");
  // The screenshot really loads (not just a broken image).
  await expect
    .poll(() => dialog.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const axe = await new AxeBuilder({ page })
    .include("[role=dialog]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);
  if (info.project.name === "mobile") {
    // Phones: full screen, swiping moves between slides.
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(390);
    await dialog.dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 300, clientY: 400 }],
    });
    await dialog.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 80, clientY: 400 }],
    });
    await expect(dialog.getByRole("heading")).toHaveText("Automatické správy");
    await page.keyboard.press("ArrowLeft");
  }

  await dialog.getByRole("button", { name: "Ďalej" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Automatické správy");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("heading")).toHaveText("Online check-in a príchody");
  await dialog.getByRole("button", { name: "Späť" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Automatické správy");
  await expect(dialog.locator("img")).toHaveAttribute("src", /autoMessages\.jpg/);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Seen → does not open again after reload.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(dialog).toBeHidden();

  // Menu "What's new" opens it from the start; "Show me" goes to the page.
  await openWhatsNew(page, info.project.name === "mobile");
  await expect(dialog.getByRole("heading")).toHaveText("Správy s hosťom");
  await dialog.getByRole("button", { name: "Ďalej" }).click();
  await dialog.getByRole("button", { name: "Ukázať mi to" }).click();
  await expect(dialog).toBeHidden();
  await page.waitForURL(/\/admin\/messages\/auto/);
});
