import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginPlatformAdmin, service, TENANT } from "./helpers";

// Control center › client › Moduly (Martin 17. 10.): after "Uložiť" the select keeps the saved state — the automatic
// form reset put it back to the first one and the next "Uložiť" switched the module off again. Ukážkový klient only.

test("module state stays in the select after saving", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: before } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "messages")
    .maybeSingle();
  try {
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}/modules`);
    const select = page.getByRole("combobox", { name: /^Stav: Správy/ });
    const form = page.locator("form").filter({ has: select });
    for (const [label, status] of [
      ["Vypnutý", "off"],
      ["Aktívny", "active"],
    ] as const) {
      await select.click();
      await page.getByRole("option", { name: label }).click();
      await form.getByRole("button", { name: "Uložiť" }).click();
      await expect
        .poll(async () => {
          const { data } = await db
            .from("tenant_modules")
            .select("status")
            .eq("tenant_id", TENANT)
            .eq("module_key", "messages")
            .single();
          return data?.status;
        })
        .toBe(status);
      await expect(select).toHaveText(label);
    }
    // Saving again keeps it.
    await form.getByRole("button", { name: "Uložiť" }).click();
    await page.waitForTimeout(1500);
    await expect(select).toHaveText("Aktívny");
    const { data: last } = await db
      .from("tenant_modules")
      .select("status")
      .eq("tenant_id", TENANT)
      .eq("module_key", "messages")
      .single();
    expect(last?.status).toBe("active");
  } finally {
    if (before)
      await db
        .from("tenant_modules")
        .update(before)
        .eq("tenant_id", TENANT)
        .eq("module_key", "messages");
    else
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "messages");
  }
});
