import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT_PROPERTY, loginOwner, markToursSeen, service } from "./helpers";

// Saving (Z55, docs/pravidla-rozhrania.md rule 3): no save button until something changes, then one bar for the page
// — "Máte neuložené zmeny · Zahodiť · Uložiť"; a toast after saving or an error; leaving asks first. Demo client only.

test("bar of unsaved changes: change → bar → save → toast; discard; leave; server error", async ({
  page,
}) => {
  const db = service();
  const { data: before } = await db
    .from("properties")
    .select("max_guests")
    .eq("id", TENANT_PROPERTY)
    .single();
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  const bar = page.getByRole("region", { name: "Neuložené zmeny" });
  try {
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}`);
    const guests = page.locator('input[name="max_guests"]');
    await expect(guests).toBeVisible();
    // Nothing changed: no bar, no save button in the sections.
    await expect(bar).toBeHidden();
    await expect(page.getByRole("main").getByRole("button", { name: "Uložiť" })).toHaveCount(0);

    // Change → the bar and the marked field; Zahodiť puts the value back.
    await guests.fill(String((before?.max_guests ?? 10) + 1));
    await expect(bar).toContainText("Máte neuložené zmeny");
    await expect(guests).toHaveAttribute("data-changed", "");
    await bar.getByRole("button", { name: "Zahodiť" }).click();
    await expect(bar).toBeHidden();
    await expect(guests).toHaveValue(String(before?.max_guests ?? 10));

    // Leaving with unsaved changes asks — "stay" keeps the page.
    await guests.fill(String((before?.max_guests ?? 10) + 1));
    page.once("dialog", (d) => {
      expect(d.message()).toContain("neuložené zmeny");
      void d.dismiss();
    });
    await page.getByRole("link", { name: "Fotky" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/admin/properties/${TENANT_PROPERTY}$`));

    // Uložiť in the bar → toast, the bar goes, the value is stored.
    await bar.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.getByText("Zmeny uložené.")).toBeVisible();
    await expect(bar).toBeHidden();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("properties")
          .select("max_guests")
          .eq("id", TENANT_PROPERTY)
          .single();
        return data?.max_guests;
      })
      .toBe((before?.max_guests ?? 10) + 1);

    // Server error → a toast with the error, the change stays.
    await page.goto(`${ADMIN_URL}/admin/settings`);
    const iban = page.locator('input[name="iban"]');
    const ibanBefore = await iban.inputValue();
    await iban.fill("XX12");
    await bar.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.locator("[data-sonner-toast][data-type=error]")).toBeVisible();
    await expect(bar).toBeVisible();
    await bar.getByRole("button", { name: "Zahodiť" }).click();
    await expect(iban).toHaveValue(ibanBefore);
  } finally {
    if (before) await db.from("properties").update(before).eq("id", TENANT_PROPERTY);
  }
});
