import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { freeStay, service, TENANT, TENANT_PROPERTY, TENANT_UNIT, TEST_DOMAIN } from "./helpers";

// Guest account v2.4 (Z43): tabs with the badge, the nearest stay as a card with what to do, breadcrumbs back,
// Moje údaje with the download of own data and the request to close the account. Demo client only.

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("account: tabs, stay card with what to do, breadcrumbs, my details, data download, close account", async ({
  page,
}, info) => {
  const db = service();
  const email = `e2e-account24-${info.project.name}-${Date.now()}@${TEST_DOMAIN}`;
  const stay = await freeStay(2);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: TENANT,
        property_id: TENANT_PROPERTY,
        unit_id: TENANT_UNIT,
        guest_name: "Účet Testový",
        guest_email: email,
        adults: 2,
        currency: "EUR",
        total_cents: 50000,
        lines: [
          {
            kind: "accommodation",
            label: "Pobyt",
            quantity: 1,
            unit_amount_cents: 50000,
            amount_cents: 50000,
          },
        ],
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      },
    })
    .single();
  if (error) throw error;
  const id = (created as { id: string }).id;
  try {
    await page.goto(`${GUEST_URL}/ucet`);
    await page.waitForURL(/\/ucet\/prihlasenie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslať kód" }).click();
    const firstDigit = page.getByLabel(/^Číslica 1 z/);
    await expect(firstDigit).toBeVisible();
    const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await firstDigit.fill(link.properties!.email_otp);
    await page.getByRole("button", { name: "Prihlásiť sa" }).click();
    // Z59: signing in opens the current stay (the only one, waiting for payment) under "Aktuálny pobyt".
    await page.waitForURL(new RegExp(`/ucet/pobyt/${id}`));
    const tabs = page.getByRole("navigation", { name: "Môj účet" });
    await expect(tabs.getByRole("link", { name: "Aktuálny pobyt" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await tabs.getByRole("link", { name: /Pobyty/ }).click();
    await page.waitForURL(/\/ucet$/);

    // Tabs: Pobyty active with the badge (waiting for payment = something to do).
    await expect(tabs.getByRole("link", { name: /Pobyty/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(tabs.getByLabel(/na vybavenie/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dobrý deň, Účet.");
    const card = page.getByRole("link", { name: /Otvoriť pobyt/ });
    await expect(card).toContainText("Zaplaťte");
    await noSeriousA11y(page);

    // Stay (the current one) → back to Pobyty by the tab (Z59).
    await card.click();
    await page.waitForURL(new RegExp(`/ucet/pobyt/${id}`));
    await tabs.getByRole("link", { name: /Pobyty/ }).click();
    await page.waitForURL(/\/ucet$/);

    // Moje údaje: details, data download, request to close the account.
    await tabs.getByRole("link", { name: "Moje údaje" }).click();
    await page.waitForURL(/\/ucet\/udaje/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Moje údaje.");
    await expect(page.getByText(email)).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Stiahnuť moje údaje" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^moje-udaje-.*\.zip$/);
    const bytes = readFileSync((await download.path())!);
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    expect(bytes.toString("utf8")).toContain(email);
    await noSeriousA11y(page);

    await page.getByRole("button", { name: "Zrušiť účet" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("zákonnej lehoty");
    await dialog.getByRole("button", { name: "Odoslať žiadosť" }).click();
    await expect(page.getByRole("status")).toContainText("Žiadosť o zrušenie účtu sme odoslali");
    const { data: guest } = await db
      .from("guests")
      .select("id, deletion_requested_at")
      .eq("tenant_id", TENANT)
      .eq("email", email)
      .single();
    expect(guest?.deletion_requested_at).not.toBeNull();
    const { count } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("dedupe_key", `account_deletion:${guest!.id}`);
    expect(count).toBe(1);
  } finally {
    const { data: guest } = await db
      .from("guests")
      .select("id")
      .eq("tenant_id", TENANT)
      .eq("email", email)
      .maybeSingle();
    if (guest)
      await db.from("notifications").delete().eq("dedupe_key", `account_deletion:${guest.id}`);
    await db.from("reservations").delete().eq("id", id);
  }
});
