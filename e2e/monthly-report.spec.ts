import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Mesačný výpis (Z62, linka B): Štatistiky › Mesačný výpis of the Ukážkový klient — the same revenue as Štatistiky,
// months switch, PDF, "Poslať účtovníkovi" without an e-mail leads to the settings; axe. Only reads.

test("monthly report: numbers as Štatistiky, months, PDF, accountant", async ({ page }, info) => {
  const mobile = info.project.name === "mobile";
  const db = service();
  const month = "2026-09";
  const { data: stats } = await db.rpc("tenant_monthly_stats", {
    p_tenant_id: TENANT,
    p_from: `${month}-01`,
    p_to: `${month}-01`,
  });
  const revenue = new Intl.NumberFormat("sk", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(stats![0]!.revenue_cents) / 100));
  const { data: settings0 } = await db
    .from("tenant_settings")
    .select("accountant_email")
    .eq("tenant_id", TENANT)
    .single();
  try {
    await db.from("tenant_settings").update({ accountant_email: null }).eq("tenant_id", TENANT);
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/statistics/report?month=${month}`);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("september 2026");
    // The same revenue as Štatistiky (one place of calculation).
    await expect(page.getByText("Tržby priamo").locator("..")).toContainText(revenue);
    await expect(page.getByRole("heading", { name: "Ušetrené na províziách" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Kde sa predalo/ })).toBeVisible();
    await expect(page.getByText(/Podklad, nie účtovný doklad/)).toBeVisible();
    const a11y = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      a11y.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
    ).toEqual([]);

    // Months switch.
    await page.getByRole("link", { name: "Predchádzajúci mesiac" }).click();
    await page.waitForURL(/month=2026-08/);
    await expect(h1).toContainText("august 2026");
    await page.getByRole("link", { name: "Nasledujúci mesiac" }).click();
    await page.waitForURL(/month=2026-09/);

    if (!mobile) {
      // PDF with the same month.
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "Stiahnuť PDF" }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(`vypis-${month}.pdf`);
      const stream = await download.createReadStream();
      const first = await new Promise<Buffer>((resolve) =>
        stream.once("data", (c) => resolve(Buffer.from(c))),
      );
      expect(first.subarray(0, 4).toString()).toBe("%PDF");
    }

    // Without the accountant's e-mail the button leads to the settings.
    await page.getByRole("link", { name: "Nastaviť účtovníka" }).click();
    await page.waitForURL(/\/admin\/settings\?tab=vypis#vypis$/);
    await expect(page.getByLabel("E-mail účtovníka")).toBeVisible();
    await expect(page.getByLabel(/Rezervácia dokončená hosťom/)).toHaveValue(/\d+/);
  } finally {
    await db
      .from("tenant_settings")
      .update({ accountant_email: settings0?.accountant_email ?? null })
      .eq("tenant_id", TENANT);
  }
});
