import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, service } from "./helpers";

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
  await expect(dialog.getByRole("heading")).toHaveText("Prehľad na jednom mieste");
  await expect(dialog).toContainText("1 z 11");
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
    await expect(dialog.getByRole("heading")).toHaveText("Rezervácie a bočný panel");
    await page.keyboard.press("ArrowLeft");
  }

  await dialog.getByRole("button", { name: "Ďalej" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Rezervácie a bočný panel");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("heading")).toHaveText("Platba prijatá jedným klikom");
  await dialog.getByRole("button", { name: "Späť" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Rezervácie a bočný panel");
  await expect(dialog.locator("img")).toHaveAttribute("src", /reservations\.jpg/);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Seen → does not open again after reload.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(dialog).toBeHidden();

  // Menu "What's new" opens it from the start; "Show me" goes to the page.
  await page.getByRole("button", { name: "Účet" }).click();
  await page.getByRole("menuitem", { name: "Čo je nové" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Prehľad na jednom mieste");
  await dialog.getByRole("button", { name: "Ďalej" }).click();
  await dialog.getByRole("button", { name: "Ukázať mi to" }).click();
  await expect(dialog).toBeHidden();
  await page.waitForURL(/\/admin\/reservations/);
});
