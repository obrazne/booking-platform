import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginPlatformAdmin, service, TENANT } from "./helpers";

// Control center (Z52, linka B): Stav systému › Zálohy (last backup, test restore recorded) and the export of the data
// of the Ukážkový klient as a ZIP (recorded in the audit). Never STRÖMY.

test("backups in Stav systému, a test restore recorded, the client's data exported", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const stamp = `E2E skúška ${Date.now().toString(36)}`;
  try {
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/status`);
    const backups = page.getByRole("region", { name: "Zálohy" });
    await expect(backups).toContainText("Posledná záloha");
    await expect(backups).toContainText("Skúšobná obnova");

    await backups.getByRole("button", { name: "Zaznamenať skúšobnú obnovu" }).click();
    await backups.getByLabel(/Čo ste skúšali/).fill(stamp);
    await backups.getByRole("button", { name: "Zaznamenať", exact: true }).click();
    await expect(page.getByText("Zaznamenané.")).toBeVisible();
    await expect(backups).toContainText(stamp);
    const axe = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

    // Export of the Ukážkový klient.
    await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}`);
    const since = new Date().toISOString();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export dát (ZIP)" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^export-ukazka-\d{4}-\d{2}-\d{2}\.zip$/);
    const zip = readFileSync((await download.path())!);
    expect(zip.subarray(0, 2).toString()).toBe("PK");
    const names = zip.toString("latin1");
    for (const name of [
      "README.txt",
      "rezervacie/reservations.json",
      "rezervacie/reservations.csv",
      "hostia/guests.json",
      "checkin/checkin_guests.json",
      "nastavenia/tenant_settings.json",
    ])
      expect(names).toContain(name);
    await expect
      .poll(async () => {
        const { count } = await db
          .from("audit_log")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", TENANT)
          .eq("action", "tenant.exported")
          .gte("created_at", since);
        return count ?? 0;
      })
      .toBe(1);
  } finally {
    await db.from("platform_backups").delete().eq("kind", "restore_test").eq("note", stamp);
  }
});
