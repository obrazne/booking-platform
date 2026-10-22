import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Mesačný výpis (Z62, linka B): Štatistiky › Mesačný výpis of the Ukážkový klient — the same revenue as Štatistiky,
// months switch, PDF, the marketing budget (Z75, desktop writes the spend of the month and removes it), "Poslať účtovníkovi" without an e-mail leads to the settings; axe. Only reads.

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
    // Z75: the saving as the budget for own marketing, with the sums since the start.
    await expect(
      page.getByRole("heading", { name: /^Váš rozpočet na vlastný marketing tento mesiac/ }),
    ).toBeVisible();
    await expect(page.getByTestId("budget-total")).toContainText("Rozpočet spolu");
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

    if (!mobile) {
      // Z75: what was spent on marketing → what is left (Martin: 2 200 € budget, 1 500 € → +700 €).
      const { data: rep } = await db.rpc("tenant_monthly_report", {
        p_tenant_id: TENANT,
        p_month: `${month}-01`,
      });
      const budget = Number((rep as { saved_cents: number }).saved_cents);
      const eur = (cents: number) =>
        new Intl.NumberFormat("sk", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        })
          .format(Math.round(cents / 100))
          .replace(/[\u00a0\u202f]/g, " ");
      const spent = page.getByLabel("Koľko ste tento mesiac minuli na marketing");
      await spent.fill("abc");
      await page.getByRole("button", { name: "Uložiť", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Zadajte sumu" })).toBeVisible();
      await spent.fill("1500");
      await page.getByRole("button", { name: "Uložiť", exact: true }).click();
      const left = budget - 150000;
      await expect(page.getByTestId("budget-result")).toHaveText(
        left >= 0
          ? `Po marketingu ste v pluse ${eur(left)} oproti Bookingu.`
          : `Na marketing ste minuli o ${eur(-left)} viac, než by si vzal Booking.`,
        { useInnerText: true },
      );
      await expect(page.getByTestId("budget-total")).toContainText(/1\s500\s€/);
      // Empty = not filled in.
      await spent.fill("");
      await page.getByRole("button", { name: "Uložiť", exact: true }).click();
      await expect(page.getByTestId("budget-result")).toHaveCount(0);
    }

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
    if (!mobile)
      await db
        .from("tenant_marketing_spend")
        .delete()
        .eq("tenant_id", TENANT)
        .eq("month", `${month}-01`);
    await db
      .from("tenant_settings")
      .update({ accountant_email: settings0?.accountant_email ?? null })
      .eq("tenant_id", TENANT);
  }
});
