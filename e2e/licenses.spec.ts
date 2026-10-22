import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, loginOwner, loginPlatformAdmin, markToursSeen, service } from "./helpers";

// Licencie (Z81, linka B): the platform admin records the licence of the Ukážkový klient (package, fees, state),
// sees the basis of the invoice of a month and downloads its PDF; the client sees the number and the package in
// Nastavenia and the banner "po splatnosti". Not suspended here — other tests book the same client at the same time
// (a suspended licence is tested in the database, licenses.test.sql). The licence is removed at the end.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);
}

test("licence: recorded in the platform, invoice basis, the client sees it", async ({ page }) => {
  const db = service();
  const number = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const { data: before } = await db
    .from("tenant_licenses")
    .select("id")
    .eq("tenant_id", TENANT)
    .maybeSingle();
  test.skip(Boolean(before), "the demo client already has a licence — not overwritten");
  try {
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}/license`);
    await expect(page.getByRole("heading", { name: "Nová licencia" })).toBeVisible();
    await page.getByLabel("Číslo licencie").fill(number);
    await page.getByRole("radio", { name: /Bez starostí/ }).check();
    await expect(page.getByLabel("Mesačne (€)")).toHaveValue("190");
    await page.getByLabel("Stav").selectOption("overdue");
    await noSeriousA11y(page);
    await page.getByRole("button", { name: "Uložiť licenciu" }).click();
    await expect(page.getByRole("heading", { name: `Licencia ${number}` })).toBeVisible();
    const { data: lic } = await db
      .from("tenant_licenses")
      .select("number, package, monthly_fee_cents, setup_fee_cents, turnover_bp, state")
      .eq("tenant_id", TENANT)
      .single();
    expect(lic).toEqual({
      number,
      package: "carefree",
      monthly_fee_cents: 19000,
      setup_fee_cents: 99000,
      turnover_bp: 200,
      state: "overdue",
    });

    // The basis of the invoice: the turnover by A10 and the lines; a PDF.
    await expect(page.getByTestId("license-turnover")).toContainText("Obrat spolu");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Stiahnuť PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^podklad-licencia-${number}-\\d{4}-\\d{2}\\.pdf$`),
    );
    const stream = await download.createReadStream();
    const first = await new Promise<Buffer>((resolve) =>
      stream.once("data", (c) => resolve(Buffer.from(c))),
    );
    expect(first.subarray(0, 4).toString()).toBe("%PDF");

    // The client: the banner on top and the licence in Nastavenia.
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin`);
    await expect(page.getByTestId("license-banner")).toContainText("Licencia je po splatnosti");
    await page.goto(`${ADMIN_URL}/admin/settings`);
    const card = page.getByTestId("license-card");
    await expect(card).toContainText(number);
    await expect(card).toContainText("Bez starostí");
    await expect(card).toContainText("Po splatnosti");
    await noSeriousA11y(page);
  } finally {
    if (!before) await db.from("tenant_licenses").delete().eq("tenant_id", TENANT);
  }
});
