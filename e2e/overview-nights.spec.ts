import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Pruh „Kde sa predali noci“ na Prehľade (Z65, linka B): the same numbers as the monthly report and Štatistiky,
// "Tento mesiac / Ďalší mesiac", a click on the bar opens the calendar of the month; axe. Only reads.

const nights = (n: number) => `${n} ${n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"}`;

test("nights bar on the Overview: numbers as the report, months, calendar", async ({ page }) => {
  const db = service();
  const now = new Date();
  const month = (offset: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return d.toISOString().slice(0, 10);
  };
  const report = async (m: string) => {
    const { data, error } = await db.rpc("tenant_monthly_report", {
      p_tenant_id: TENANT,
      p_month: m,
    });
    if (error) throw error;
    return data as {
      occupied_nights: number;
      available_nights: number;
      nights_sold: number;
    };
  };
  const [thisMonth, nextMonth] = [await report(month(0)), await report(month(1))];
  // One place of calculation: the report = Štatistiky.
  const { data: stats } = await db.rpc("tenant_monthly_stats", {
    p_tenant_id: TENANT,
    p_from: month(0),
    p_to: month(0),
  });
  expect(stats![0]!.occupied_nights).toBe(thisMonth.occupied_nights);
  expect(stats![0]!.nights_sold).toBe(thisMonth.nights_sold);

  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin`);
  const card = page.getByRole("region", { name: "Kde sa predali noci" });
  const title = (r: typeof thisMonth) =>
    `Kde sa predalo ${r.occupied_nights} z ${r.available_nights} nocí`;
  await expect(card.getByText(title(thisMonth))).toBeVisible();
  await expect(card.getByText(`Priamo · ${nights(thisMonth.nights_sold)}`)).toBeVisible();
  const free = thisMonth.available_nights - thisMonth.occupied_nights;
  await expect(card.getByText(`Voľné · ${nights(Math.max(0, free))}`)).toBeVisible();

  const a11y = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);

  // Next month: the free nights to sell.
  await card.getByRole("button", { name: "Ďalší mesiac" }).click();
  await expect(card.getByRole("button", { name: "Ďalší mesiac" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(card.getByText(title(nextMonth))).toBeVisible();
  await expect(card.getByText(/Voľné noci ešte môžete predať/)).toBeVisible();

  // A click on the bar opens the calendar of that month.
  await card
    .getByRole("link", { name: /otvoriť kalendár mesiaca/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.waitForURL(new RegExp(`/admin/calendar\\?month=${month(1).slice(0, 7)}`));
});
