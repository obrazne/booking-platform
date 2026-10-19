import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, loginOwner, markToursSeen, service } from "./helpers";

// Nastavenia with tabs and the ways to pay (Z69, vizuál administrácie v1.7, doska 18): the tab in the address, old
// addresses redirect, each tab saves only its own fields, at least one way to pay stays on, card payments (Stripe)
// are shown as "Pripravujeme" and cannot be switched on. Demo client only; changed values are put back.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
});

test("tabs in the address; old addresses lead to their tab", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/admin/settings`);
  const tabs = page.getByRole("navigation", { name: "Časti nastavení" });
  await expect(tabs.getByRole("link")).toHaveText([
    "Všeobecné",
    "Platby",
    "Pravidlá pobytu",
    "Prepojenia",
    "E-maily a upozornenia",
    "Tím",
    "Mesačný výpis",
  ]);
  await expect(tabs.getByRole("link", { name: "Všeobecné" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await tabs.getByRole("link", { name: "Platby" }).click();
  await expect(page).toHaveURL(/tab=platby/);
  await expect(page.getByRole("heading", { name: "Spôsoby platby" })).toBeVisible();

  for (const [old, tab] of [
    ["/admin/ical", "prepojenia"],
    ["/admin/team", "tim"],
    ["/admin/settings/notifications", "upozornenia"],
  ] as const) {
    await page.goto(`${ADMIN_URL}${old}`);
    await expect(page).toHaveURL(new RegExp(`/admin/settings\\?tab=${tab}$`));
    await expect(
      page.getByRole("navigation", { name: "Časti nastavení" }).locator('[aria-current="page"]'),
    ).toBeVisible();
  }
  await expect(page.getByRole("row", { name: /Nová rezervácia/ })).toContainText("áno");
});

test("ways to pay: transfer stays on as the only one, card is Pripravujeme; a tab keeps the others", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: before } = await db
    .from("tenant_settings")
    .select("iban, bank_transfer_enabled, contact_name, card_enabled")
    .eq("tenant_id", TENANT)
    .single();
  try {
    await page.goto(`${ADMIN_URL}/admin/settings?tab=platby`);
    const transfer = page.getByRole("button", { name: /Prevod na účet s QR/ });
    await expect(transfer).toContainText("Zapnuté");
    const card = page.getByRole("button", { name: /Platba kartou \(Stripe\)/ });
    await expect(card).toContainText("Pripravujeme");
    await card.click();
    await expect(page.getByRole("button", { name: "Prepojiť so Stripe" })).toBeDisabled();
    await expect(page.getByText("Záloha a doplatok")).toBeVisible();
    await noSeriousA11y(page);

    // Switching off the only way to pay → an error, nothing saved.
    await transfer.click();
    await page.getByLabel("Ponúkať hosťom prevod na účet").uncheck();
    const bar = page.getByRole("region", { name: "Neuložené zmeny" });
    await bar.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.locator("[data-sonner-toast][data-type=error]")).toContainText(
      "Aspoň jeden spôsob platby",
    );
    await bar.getByRole("button", { name: "Zahodiť" }).click();
    const { data: after } = await db
      .from("tenant_settings")
      .select("bank_transfer_enabled")
      .eq("tenant_id", TENANT)
      .single();
    expect(after?.bank_transfer_enabled).toBe(true);

    // The database refuses it too, and card payments without a connected Stripe account.
    const off = await db
      .from("tenant_settings")
      .update({ bank_transfer_enabled: false })
      .eq("tenant_id", TENANT);
    expect(off.error?.code).toBe("23514");
    const cardOn = await db
      .from("tenant_settings")
      .update({ card_enabled: true })
      .eq("tenant_id", TENANT);
    expect(cardOn.error?.code).toBe("23514");

    // Všeobecné saves its fields only — the account on the Platby tab stays.
    await page.goto(`${ADMIN_URL}/admin/settings`);
    await page.locator("#contact_name").fill(`E2E kontakt ${Date.now().toString(36)}`);
    await bar.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.getByText("Zmeny uložené.")).toBeVisible();
    const { data: saved } = await db
      .from("tenant_settings")
      .select("iban, bank_transfer_enabled")
      .eq("tenant_id", TENANT)
      .single();
    expect(saved).toEqual({ iban: before!.iban, bank_transfer_enabled: true });

    // The search leads to the field on its tab, the row with it open.
    await page.goto(`${ADMIN_URL}/admin/settings?tab=platby&hl=iban`);
    await expect(page.locator("#iban")).toBeVisible();
  } finally {
    if (before)
      await db
        .from("tenant_settings")
        .update({ contact_name: before.contact_name })
        .eq("tenant_id", TENANT);
  }
});
