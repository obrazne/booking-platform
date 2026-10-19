import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, TENANT_NAME, loginOwner, loginPlatformAdmin, service } from "./helpers";

// History of changes and the trash (Z31).

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);

test("owner deletes a service and restores it from Nedávno zmazané", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const name = `E2E služba ${stamp}`;
  const { data: created } = await db
    .from("services")
    .insert({ tenant_id: TENANT, name: { sk: name }, amount_cents: 4200, price_model: "per_stay" })
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
    .insert({ tenant_id: TENANT, name: { sk: name }, amount_cents: 1000, price_model: "per_stay" })
    .select("id")
    .single();
  await db.from("services").update({ amount_cents: 1500 }).eq("id", created!.id);
  // The change as if a person of the team made it (only those can be reverted, Z64).
  await db
    .from("record_history")
    .update({ source: "user" })
    .eq("table_name", "services")
    .eq("record_id", created!.id)
    .eq("op", "update");
  try {
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}/audit?table=services`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(TENANT_NAME);
    const entry = page.getByRole("listitem").filter({ hasText: `${name} — zmenené` });
    // Collapsed row (Z64): a click opens "before → after".
    await entry.locator("summary").click();
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

test("synchronisation of a portal calendar is one summary, hidden by default, not revertable (Z64)", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const stamp = Date.now().toString(36);
  const { data: channel, error } = await db
    .from("ical_channels")
    .insert({
      tenant_id: TENANT,
      unit_id: "c0000000-0000-4000-8000-000000000062",
      name: `E2E Airbnb ${stamp}`,
      source: "airbnb",
      import_url: "https://example.invalid/e2e-history.ics",
      active: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  const year = new Date().getUTCFullYear() + 3;
  try {
    await db.rpc("ical_apply", {
      p_channel_id: channel.id,
      p_events: [
        { uid: `a-${stamp}`, start: `${year}-10-16`, end: `${year}-10-20`, summary: "Reserved" },
        { uid: `b-${stamp}`, start: `${year}-10-30`, end: `${year}-11-02`, summary: "Reserved" },
      ],
    });
    const { count: rows } = await db
      .from("record_history")
      .select("id", { count: "exact", head: true })
      .eq("table_name", "occupancy")
      .eq("source", "system")
      .like("new_row->>ical_uid", `%-${stamp}`);
    expect(rows).toBe(0);

    await loginPlatformAdmin(page, ADMIN_URL);
    const summary = `Airbnb (E2E Airbnb ${stamp}): 2 pridané`;
    await page.goto(`${ADMIN_URL}/platform/tenants/${TENANT}/audit`);
    await expect(page.getByText(summary)).toHaveCount(0);
    await page.getByRole("button", { name: "Aj synchronizácia kalendárov" }).click();
    await page.waitForURL(/sync=1/);
    const entry = page.getByRole("listitem").filter({ hasText: summary });
    await entry.locator("summary").click();
    await expect(entry).toContainText(`pridaný pobyt: 16.–20. 10. ${year}`);
    await expect(entry).toContainText(`30. 10.–2. 11. ${year}`);
    await expect(entry.getByRole("button", { name: "Vrátiť túto zmenu" })).toHaveCount(0);
    await expect(entry).toContainText("vrátiť sa dajú len zmeny od ľudí");
  } finally {
    await db
      .from("record_history")
      .delete()
      .eq("table_name", "ical_sync")
      .eq("record_id", channel.id);
    await db.from("ical_channels").delete().eq("id", channel.id);
  }
});
