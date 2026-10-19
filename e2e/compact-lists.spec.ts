import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, loginOwner, markToursSeen, service } from "./helpers";

// Compact lists (Z56, docs/pravidla-rozhrania.md rule 4): seasons, fees, discounts and units as collapsed rows with the key
// facts, the arrow opens the form; "Nový …" waits behind "Pridať …" and opens on top. A yearly season shows day and month
// (20. 3.), not the stored year 2000. Demo client only; the test season is deleted at the end.

test("seasons as rows, yearly range as day and month; add forms behind a button", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop; phone width in ui-rules");
  const db = service();
  const name = `E2E sezóna ${Date.now().toString(36)}`;
  const { data: season } = await db
    .from("seasons")
    .insert({
      tenant_id: TENANT,
      property_id: TENANT_PROPERTY,
      name: { sk: name },
      priority: -100,
      min_nights: 3,
    })
    .select("id")
    .single();
  await db.from("season_ranges").insert({
    tenant_id: TENANT,
    season_id: season!.id,
    start_date: "2000-03-20",
    end_date: "2000-03-22",
    repeat_yearly: true,
  });
  try {
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/pricing`);
    // Collapsed: no form fields until a row opens.
    await expect(page.locator('input[name="min_nights"]')).toHaveCount(0);
    const row = page.getByRole("button", { name: new RegExp(name) });
    await expect(row).toContainText("20. 3. – 22. 3. každý rok");
    await expect(row).toContainText("min. 3 noci");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: /predvolená/ }).first()).toContainText("/ noc");

    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const region = page.getByRole("region", { name: new RegExp(name) });
    await expect(region.getByLabel(/^Od \(deň a mesiac/)).toHaveValue("20. 3.");
    await expect(region.getByLabel("Opakovať každý rok")).toBeChecked();
    await expect(region.locator('input[name="range_start"]')).toHaveValue("2000-03-20");

    // Typed day and month → stored in the year 2000 as before.
    await region.getByLabel(/^Do \(deň a mesiac/).fill("24. 3.");
    await expect(region.locator('input[name="range_end"]')).toHaveValue("2000-03-24");
    const bar = page.getByRole("region", { name: "Neuložené zmeny" });
    await bar.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.getByText("Zmeny uložené.")).toBeVisible();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("season_ranges")
          .select("start_date, end_date, repeat_yearly")
          .eq("season_id", season!.id);
        return JSON.stringify(data);
      })
      .toBe(
        JSON.stringify([{ start_date: "2000-03-20", end_date: "2000-03-24", repeat_yearly: true }]),
      );

    // "Pridať sezónu" opens the new form on top, expanded.
    await page.getByRole("button", { name: "Pridať sezónu" }).click();
    const first = page.locator("main ul > li").first();
    await expect(first.getByRole("button", { name: /Nová sezóna/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Fees and discounts, units: the same — rows, add forms closed.
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/extras`);
    await expect(page.getByRole("button", { name: "Pridať poplatok" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pridať zľavu" })).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toHaveCount(0);
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/units`);
    await expect(page.getByRole("button", { name: "Pridať jednotku" })).toBeVisible();
    await expect(page.locator('input[name="max_guests"]')).toHaveCount(0);
  } finally {
    await db.from("seasons").delete().eq("id", season!.id);
  }
});
