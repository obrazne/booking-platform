import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, TENANT_NAME, loginPlatformAdmin } from "./helpers";

// Control center › Klienti (Z57, linka B): search and filters, the row opens the detail, the arrow its preview,
// clients opened lately stay in the menu (also after leaving and reloading). Only reads; STRÖMY is only opened.

test("client list search, the row opens the detail, opened clients stay in the menu", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  await loginPlatformAdmin(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/platform`);
  const list = page.getByRole("list", { name: "Klienti" });
  await expect(list.getByRole("listitem")).not.toHaveCount(0);

  // Search by the address of the client's page.
  await page.getByRole("searchbox", { name: /Hľadať klienta/ }).fill("ukazka");
  await expect(page).toHaveURL(/q=ukazka/);
  await expect(list.getByRole("link", { name: /Otvoriť detail klienta/ })).toHaveCount(1);
  await expect(list).toContainText(TENANT_NAME);
  await expect(list).not.toContainText("STRÖMY");

  // Filter by state shows counts; a filter nobody matches says so.
  await page.goto(`${ADMIN_URL}/platform?status=suspended&q=ukazka`);
  await expect(page.getByText("Žiadny klient nezodpovedá hľadaniu alebo filtrom.")).toBeVisible();
  await page.goto(`${ADMIN_URL}/platform?q=ukazka`);
  const a11y = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);

  // The arrow only expands the preview; the row opens the detail.
  const arrow = page.getByRole("button", { name: `Náhľad klienta ${TENANT_NAME}` });
  await arrow.click();
  await expect(arrow).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/\/platform\?q=ukazka$/);
  await page.getByRole("link", { name: `Otvoriť detail klienta ${TENANT_NAME}` }).click();
  await page.waitForURL(new RegExp(`/platform/tenants/${TENANT}$`));

  // Another client opened, then back to all clients: both stay in the menu, collapsed; also after a reload.
  await page.goto(`${ADMIN_URL}/platform?q=str`);
  const other = page.getByRole("link", { name: /Otvoriť detail klienta/ }).first();
  const otherName = (await other.getAttribute("aria-label"))!.replace(
    "Otvoriť detail klienta ",
    "",
  );
  await other.click();
  await page.waitForURL(/\/platform\/tenants\/[0-9a-f-]{36}$/);
  await page.goto(`${ADMIN_URL}/platform`);
  await page.locator("aside").hover();
  const menu = page.getByRole("navigation", { name: "Hlavné menu" }).filter({ visible: true });
  for (const name of [TENANT_NAME, otherName]) {
    const group = menu.getByRole("link", { name: new RegExp(`^${name}`) });
    await expect(group).toBeVisible();
    await expect(group).toHaveAttribute("aria-expanded", "false");
  }
  // The newest first.
  const labels = await menu.locator("a[aria-expanded]").allInnerTexts();
  expect(labels.findIndex((l) => l.includes(otherName))).toBeLessThan(
    labels.findIndex((l) => l.includes(TENANT_NAME)),
  );
});
