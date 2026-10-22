import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { PROPERTY_SLUG } from "./helpers";

// Accessibility (WCAG 2.1 AA) of the guest page: serious and critical problems fail the test, the rest is listed.
async function audit(page: import("@playwright/test").Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const lines = result.violations.map(
    (v) =>
      `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0]?.message ?? "").slice(0, 90)).join(" | ")}`,
  );
  console.log(
    `[a11y] ${label}: ${lines.length === 0 ? "bez nálezov" : "\n  " + lines.join("\n  ")}`,
  );
  return result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

test("guest page and cart have no serious accessibility problems", async ({ page }) => {
  await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
  expect(await audit(page, "detail")).toEqual([]);
  await page.getByRole("button", { name: "Pozrieť pobyt" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // Measure after the opening animation — mid-fade the colours are blended and contrast looks lower than it is.
  await page
    .getByRole("dialog")
    .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  expect(await audit(page, "košík")).toEqual([]);
});
