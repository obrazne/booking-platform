import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, loginOwner, loginPlatformAdmin, markToursSeen } from "./helpers";

// Long lists and width (Z63, docs/pravidla-rozhrania.md rules 6–7): lists are paged by the database — "1–20 z N",
// pages, 20 / 50 / 100 per page remembered for the list, everything in the URL; the audit searches the human text in
// SQL. Lists, records and overviews use the whole width and no field leaves its card at 1280 / 1440 / 1920 px.

test("reservations: 1–20 z N, next page, 50 per page remembered", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/reservations`);
  const paging = page.getByRole("navigation", { name: "Stránkovanie" });
  const range = paging.getByRole("status");
  await expect(range).toHaveText(/^1–\d+ z \d+$/);
  const total = Number((await range.textContent())!.split(" z ")[1]!.replace(/\s/g, ""));
  test.skip(total <= 20, "demo data have 20 reservations or fewer");
  await expect(range).toHaveText(`1–20 z ${total}`);

  await paging.getByRole("link", { name: "Strana 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(range).toHaveText(`21–${Math.min(40, total)} z ${total}`);
  await expect(paging.getByRole("link", { name: "Strana 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // 50 per page: back to page 1, in the URL, and remembered when the list is opened again.
  await paging.getByLabel("Na stránku").selectOption("50");
  await expect(page).toHaveURL(/size=50/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(range).toHaveText(`1–${Math.min(50, total)} z ${total}`);
  await page.goto(`${ADMIN_URL}/admin/reservations`);
  await expect(paging.getByLabel("Na stránku")).toHaveValue("50");
  await paging.getByLabel("Na stránku").selectOption("20");
  await expect(range).toHaveText(`1–20 z ${total}`);
});

test("audit: one page from the database, search by the human text", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await loginPlatformAdmin(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/platform/audit?q=odkazom`);
  const range = page.getByRole("navigation", { name: "Stránkovanie" }).getByRole("status");
  await expect(range).toHaveText(/^1–\d+ z [\d\s]+$/);
  const items = page.getByRole("list", { name: "Audit" }).getByRole("listitem");
  expect(await items.count()).toBeLessThanOrEqual(20);
  // "odkazom" is only in the text "Prihlásenie (odkazom z e-mailu)", never in the stored action code.
  await expect(items.first()).toContainText("odkazom z e-mailu");
  await page.goto(`${ADMIN_URL}/platform/audit?tenant=${TENANT}&size=100`);
  expect(await items.count()).toBeLessThanOrEqual(100);
});

/** Fields and buttons that stick out of their card, row or form (rule 6), and horizontal scroll of the page. */
async function overflows(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1)
      out.push("page scrolls sideways");
    for (const el of document.querySelectorAll<HTMLElement>(
      "main input:not([type=hidden]), main select, main textarea, main button, main [data-slot=select-trigger]",
    )) {
      if (el.offsetParent === null) continue;
      const box = el.closest<HTMLElement>("form, li, section, [role=region], [role=row], .surface");
      if (!box) continue;
      const a = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      // Inside a scrolling table the row may be wider than the screen — that is the table's job, not an overflow.
      if (box.closest(".overflow-x-auto")) continue;
      if (a.right > b.right + 1 || a.left < b.left - 1)
        out.push(
          `${el.tagName.toLowerCase()} ${el.getAttribute("name") ?? el.textContent?.trim().slice(0, 30)}`,
        );
    }
    return out;
  });
}

for (const width of [1280, 1440, 1920]) {
  test(`width ${width}px: lists use the width, no field leaves its card`, async ({
    page,
  }, info) => {
    test.skip(info.project.name === "mobile", "desktop widths");
    await page.setViewportSize({ width, height: 900 });
    await loginPlatformAdmin(page, ADMIN_URL);
    for (const path of [
      "/platform",
      "/platform/audit",
      `/platform/tenants/${TENANT}/audit`,
      "/platform/modules",
    ]) {
      await page.goto(`${ADMIN_URL}${path}`);
      await page.waitForLoadState("networkidle");
      expect(await overflows(page), path).toEqual([]);
    }
    // A list goes over the whole width of the content, not ~1080 px.
    await page.goto(`${ADMIN_URL}/platform/audit`);
    const main = await page.locator("main").boundingBox();
    const list = await page.getByRole("list", { name: "Audit" }).boundingBox();
    expect(list!.width, "audit list width").toBeGreaterThan(main!.width - 2 * 48);

    await page.context().clearCookies();
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    for (const path of [
      "/admin/reservations",
      "/admin/calendar",
      "/admin/statistics",
      "/admin/portal-stays",
      "/admin/messages",
    ]) {
      await page.goto(`${ADMIN_URL}${path}`);
      await page.waitForLoadState("networkidle");
      expect(await overflows(page), path).toEqual([]);
    }
  });
}
