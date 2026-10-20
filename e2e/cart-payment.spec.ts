import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { PROPERTY_SLUG, TENANT, TEST_DOMAIN, freeStay, pickStay, service } from "./helpers";

// Košík, krok Platba (Z71, linka B) on the Ukážkový klient: the account sentence and the company for an invoice
// (step 2), the term held for the order, the ways to pay as cards (card "Pripravujeme" inactive on staging), the
// discount code behind a link and folded once used, the cancellation said once; the reservation keeps the way to pay
// and the company. A temporary promo code and the test reservation are removed at the end.

test("cart payment step: invoice to a company, way to pay, discount code, texts once", async ({
  page,
}, info) => {
  const db = service();
  const stamp = Date.now().toString(36).toUpperCase();
  const code = `E2EB${stamp}`;
  const email = `e2e-kosik-${stamp.toLowerCase()}+b@${TEST_DOMAIN}`;
  const { data: promo, error } = await db
    .from("discounts")
    .insert({
      tenant_id: TENANT,
      kind: "promo",
      name: { sk: "E2E zľava" },
      code,
      percent_bp: 1000,
    })
    .select("id")
    .single();
  if (error) throw error;
  try {
    const stay = await freeStay(2);
    await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
    const calendar = page.locator("#termin");
    await calendar.scrollIntoViewIfNeeded();
    await pickStay(calendar, stay.checkIn, stay.checkOut);
    const cart = page.getByRole("dialog");
    await cart.getByRole("button", { name: "Pokračovať" }).filter({ visible: true }).click();

    // Step 2: the account (no password) and the company for an invoice.
    await cart.locator("#c-name").fill(`E2E Košík ${info.project.name}`);
    await cart.locator("#c-email").fill(email);
    await expect(
      cart.getByText(/Pobyt nájdete aj v Mojom účte — prihlásite sa e-mailom, bez hesla/),
    ).toBeVisible();
    await expect(cart.locator('input[type="password"]')).toHaveCount(0);
    await cart.getByRole("checkbox", { name: "Chcem faktúru na firmu" }).check();
    const next = cart
      .getByRole("button", { name: "Skontrolovať a zaplatiť" })
      .filter({ visible: true });
    // Without IČO and the address the company is not complete.
    await cart.getByLabel("Názov firmy").fill("E2E Firma s.r.o.");
    await expect(next).toBeDisabled();
    await cart.getByLabel("IČO").fill("12345678");
    await cart.getByLabel("DIČ").fill("2020123456");
    await cart.getByLabel("Adresa firmy").fill("Hlavná 1, 811 01 Bratislava");
    await next.click();

    // Step 3: the hold, the ways to pay, the cancellation once.
    await expect(
      cart.getByText(/Termín vám držíme \d+ minút, kým dokončíte objednávku/),
    ).toBeVisible();
    await expect(cart.getByRole("radio", { name: /Prevod s QR kódom/ })).toBeChecked();
    await expect(cart.getByText(/Zaplatiť treba do \d+ h/)).toHaveCount(1);
    const card = cart.getByRole("radio", { name: /Platba kartou/ });
    await expect(card).toBeDisabled();
    await expect(cart.getByText("Pripravujeme")).toBeVisible();
    await expect(cart.getByText(/Storno podľa podmienok/).filter({ visible: true })).toHaveCount(0);

    // The discount code behind a link; once used a folded row.
    await expect(cart.getByLabel("Zľavový kód")).toHaveCount(0);
    await cart.getByRole("button", { name: "Máte zľavový kód?" }).click();
    await cart.getByLabel("Zľavový kód").fill(code);
    await cart.getByRole("button", { name: "Použiť" }).click();
    await expect(cart.getByText(new RegExp(`Kód ${code} · −`))).toBeVisible();
    await expect(cart.getByLabel("Zľavový kód")).toHaveCount(0);

    const a11y = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      a11y.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
    ).toEqual([]);

    await cart.getByRole("checkbox", { name: /obchodnými podmienkami/ }).check();
    await cart.getByRole("checkbox", { name: /storno podmienky/ }).check();
    const submit = cart.getByRole("button", { name: "Rezervovať s povinnosťou platby" });
    await expect(submit).toBeEnabled();
    await page.waitForTimeout(3200);
    await submit.click();
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]+/);

    const { data: r } = await db
      .from("reservations")
      .select("payment_method, promo_code, billing_company, billing_company_id, billing_address")
      .eq("guest_email", email)
      .single();
    expect(r).toEqual({
      payment_method: "bank_transfer",
      promo_code: code,
      billing_company: "E2E Firma s.r.o.",
      billing_company_id: "12345678",
      billing_address: "Hlavná 1, 811 01 Bratislava",
    });
  } finally {
    const { data: rows } = await db.from("reservations").select("id").eq("guest_email", email);
    for (const row of rows ?? []) {
      await db.from("email_outbox").delete().eq("reservation_id", row.id);
      await db.from("occupancy").delete().eq("reservation_id", row.id);
      await db.from("reservations").delete().eq("id", row.id);
    }
    await db.from("discounts").delete().eq("id", promo.id);
  }
});
