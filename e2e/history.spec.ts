import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, loginPlatformAdmin, service, STROMY } from "./helpers";

// History of changes and the trash (Z31).

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);

test("owner deletes a service and restores it from Nedávno zmazané", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const name = `E2E služba ${stamp}`;
  const { data: created } = await db
    .from("services")
    .insert({ tenant_id: STROMY, name: { sk: name }, amount_cents: 4200, price_model: "per_stay" })
    .select("id")
    .single();
  try {
    await loginOwner(page, ADMIN_URL);
    page.on("dialog", (d) => d.accept());
    await page.goto(`${ADMIN_URL}/admin/services`);
    await page
      .getByRole("button", { name: new RegExp(name) })
      .first()
      .click();
    const row = page.locator("form").filter({ has: page.locator(`input[value="${name}"]`) });
    await row.getByRole("button", { name: "Zmazať" }).click();
    await expect
      .poll(async () => (await db.from("services").select("id").eq("id", created!.id)).data?.length)
      .toBe(0);

    await page.goto(`${ADMIN_URL}/admin/settings/trash`);
    await expect(page.getByRole("heading", { level: 1, name: "Nedávno zmazané" })).toBeVisible();
    const item = page.getByRole("listitem").filter({ hasText: name });
    await expect(item).toContainText("Doplnková služba");
    await item.getByRole("button", { name: /Obnoviť/ }).click();
    // Restored: back in the services, gone from the trash.
    await expect
      .poll(
        async () =>
          (await db.from("services").select("amount_cents").eq("id", created!.id)).data?.[0]
            ?.amount_cents,
      )
      .toBe(4200);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  } finally {
    await db.from("services").delete().eq("id", created!.id);
    await db
      .from("record_history")
      .delete()
      .eq("table_name", "services")
      .eq("record_id", created!.id);
  }
});

test("platform admin reverts a price change in Záznam zmien", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const name = `E2E cena ${stamp}`;
  const { data: created } = await db
    .from("services")
    .insert({ tenant_id: STROMY, name: { sk: name }, amount_cents: 1000, price_model: "per_stay" })
    .select("id")
    .single();
  await db.from("services").update({ amount_cents: 1500 }).eq("id", created!.id);
  try {
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/tenants/${STROMY}/audit?table=services`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chalet STRÖMY");
    const entry = page.getByRole("listitem").filter({ hasText: `${name} — zmenené` });
    await expect(entry).toContainText("→");
    await entry.getByRole("button", { name: "Vrátiť túto zmenu" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Vrátiť túto zmenu" }).click();
    await expect(entry.getByRole("status")).toHaveText("Zmena je vrátená.");
    const { data: back } = await db
      .from("services")
      .select("amount_cents")
      .eq("id", created!.id)
      .single();
    expect(back?.amount_cents).toBe(1000);
  } finally {
    await db.from("services").delete().eq("id", created!.id);
    await db
      .from("record_history")
      .delete()
      .eq("table_name", "services")
      .eq("record_id", created!.id);
  }
});
