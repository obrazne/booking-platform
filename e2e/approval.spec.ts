import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import {
  PROPERTY_SLUG,
  TENANT,
  TENANT_PROPERTY,
  TENANT_UNIT,
  TEST_DOMAIN,
  freeStay,
  loginOwner,
  markToursSeen,
  pickStay,
  service,
} from "./helpers";

// Rezervácie na schválenie a rekreačný poukaz (Z77, linka B) on the Ukážkový klient: the guest pays by a voucher in the
// cart → waits for the owner (no payment details), the owner approves with the company and the amount of the voucher →
// the guest pays only the rest (QR), two bases; decline; not approved in 48 h → cancelled (the cron function). The
// property of the demo stays "Okamžite" (other tests book it); the voucher is switched on only for this test.

async function noSeriousA11y(page: Page, include: string) {
  const r = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);
}

test("approval: voucher in the cart, approve with the company, decline, expiry", async ({
  page,
}) => {
  const db = service();
  const stamp = Date.now().toString(36);
  const email = (what: string) => `e2e-schvalenie-${what}-${stamp}+b@${TEST_DOMAIN}`;
  const { data: settings0 } = await db
    .from("tenant_settings")
    .select("voucher_enabled")
    .eq("tenant_id", TENANT)
    .single();
  const viaRpc = async (what: string) => {
    const stay = await freeStay(2);
    const { data, error } = await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: TENANT_PROPERTY,
          unit_id: TENANT_UNIT,
          guest_name: `E2E ${what}`,
          guest_email: email(what),
          adults: 2,
          currency: "EUR",
          total_cents: 40000,
          status: "pending_payment",
          source: "direct",
          payment_method: "recreation_voucher",
          voucher: { number: `RP-${what}`, issuer: "E2E Benefit" },
          lines: [
            {
              kind: "accommodation",
              label: "Pobyt",
              quantity: 2,
              unit_amount_cents: 20000,
              amount_cents: 40000,
            },
          ],
          check_in: stay.checkIn,
          check_out: stay.checkOut,
        },
      })
      .single();
    if (error) throw error;
    return data as { id: string; access_token: string };
  };

  try {
    await db.from("tenant_settings").update({ voucher_enabled: true }).eq("tenant_id", TENANT);

    // 1) The guest pays by a recreation voucher in the cart.
    const stay = await freeStay(2);
    await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
    const calendar = page.locator("#termin");
    await calendar.scrollIntoViewIfNeeded();
    await pickStay(calendar, stay.checkIn, stay.checkOut);
    const cart = page.getByRole("dialog");
    await cart.getByRole("button", { name: "Pokračovať" }).filter({ visible: true }).click();
    await cart.locator("#c-name").fill("E2E Poukaz");
    await cart.locator("#c-email").fill(email("kosik"));
    await cart
      .getByRole("button", { name: "Skontrolovať a zaplatiť" })
      .filter({ visible: true })
      .click();
    await cart.getByRole("radio", { name: /Rekreačný poukaz/ }).check();
    await cart.getByRole("textbox", { name: "Číslo poukazu" }).fill("RP-E2E-1");
    await cart.getByRole("textbox", { name: "Vydavateľ poukazu" }).fill("E2E Benefit s.r.o.");
    await noSeriousA11y(page, '[role="dialog"]');
    await cart.getByRole("checkbox", { name: /obchodnými podmienkami/ }).check();
    await cart.getByRole("checkbox", { name: /storno podmienky/ }).check();
    await page.waitForTimeout(3200);
    await cart.getByRole("button", { name: "Rezervovať s povinnosťou platby" }).click();
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]+/);
    const guestUrl = page.url();

    // Waiting for the owner: the term is held, no payment details yet.
    await expect(page.getByText(/čaká na potvrdenie majiteľa/)).toBeVisible();
    await expect(page.getByRole("img", { name: /PAY by square/ })).toHaveCount(0);
    await expect(page.getByText("Majiteľ potvrdí termín")).toBeVisible();
    const { data: r } = await db
      .from("reservations")
      .select("id, status, total_cents, voucher_number, voucher_issuer, approval_due_at")
      .eq("guest_email", email("kosik"))
      .single();
    expect(r).toMatchObject({
      status: "awaiting_approval",
      voucher_number: "RP-E2E-1",
      voucher_issuer: "E2E Benefit s.r.o.",
    });
    expect(r!.approval_due_at).not.toBeNull();

    // 2) The owner approves with the company of the voucher and its amount (300 €).
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/reservations?panel=reservation:${r!.id}`);
    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Čaká na vaše schválenie do");
    await expect(card).toContainText("Poukaz č. RP-E2E-1 · E2E Benefit s.r.o.");
    await card.getByRole("button", { name: "Schváliť" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel("Suma poukazu").fill("300");
    await dialog.getByLabel("Firma (odberateľ)").fill("E2E Zamestnávateľ a.s.");
    await dialog.getByLabel("IČO").fill("87654321");
    await dialog.getByLabel("Adresa firmy").fill("Priemyselná 2, Žilina");
    await noSeriousA11y(page, '[role="alertdialog"]');
    await dialog.getByRole("button", { name: "Schváliť" }).click();
    await expect(dialog).toHaveCount(0);
    const rest = r!.total_cents - 30000;
    const eur = (cents: number) =>
      new Intl.NumberFormat("sk", { style: "currency", currency: "EUR" })
        .format(cents / 100)
        .replace(/[  ]/g, " ");
    await expect(page.getByText(`Čaká na platbu ${eur(rest)}`).first()).toBeVisible();
    await expect(page.getByTestId("basis-voucher")).toBeVisible();
    const { data: pays } = await db
      .from("payments")
      .select("provider, status, amount_cents")
      .eq("reservation_id", r!.id)
      .order("provider");
    expect(pays).toEqual([
      { provider: "bank_transfer", status: "pending", amount_cents: rest },
      { provider: "recreation_voucher", status: "received", amount_cents: 30000 },
    ]);

    // The guest now sees the QR for the rest only.
    await page.goto(guestUrl);
    await expect(page.getByRole("img", { name: /PAY by square/ })).toBeVisible();
    await expect(page.getByText(eur(rest)).first()).toBeVisible();

    // 3) Decline: the term is released, the guest gets an e-mail.
    const declined = await viaRpc("zamietnut");
    await page.goto(`${ADMIN_URL}/admin/reservations?panel=reservation:${declined.id}`);
    await page.getByTestId("approval-card").getByRole("button", { name: "Zamietnuť" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Zamietnuť" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect
      .poll(async () => {
        const { data } = await db
          .from("reservations")
          .select("status, cancelled_reason")
          .eq("id", declined.id)
          .single();
        return data;
      })
      .toEqual({ status: "cancelled", cancelled_reason: "approval_declined" });

    // 4) Not approved within 48 h → cancelled by the scheduled function.
    const late = await viaRpc("vyprsat");
    await db
      .from("reservations")
      .update({ approval_due_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", late.id);
    await db.rpc("expire_pending_reservations");
    const { data: expired } = await db
      .from("reservations")
      .select("status, cancelled_reason")
      .eq("id", late.id)
      .single();
    expect(expired).toEqual({ status: "cancelled", cancelled_reason: "approval_expired" });

    // 5) The property says how reservations are accepted (the demo stays "Okamžite").
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}`);
    const how = page.getByTestId("booking-approval");
    await expect(how.getByRole("radio", { name: /Okamžite/ })).toBeChecked();
    await expect(how.getByRole("radio", { name: /Na schválenie/ })).not.toBeChecked();
  } finally {
    await db
      .from("tenant_settings")
      .update({ voucher_enabled: settings0?.voucher_enabled ?? false })
      .eq("tenant_id", TENANT);
    const { data: rows } = await db
      .from("reservations")
      .select("id")
      .like("guest_email", `e2e-schvalenie-%-${stamp}+b@${TEST_DOMAIN}`);
    for (const row of rows ?? []) {
      await db.from("email_outbox").delete().eq("reservation_id", row.id);
      await db.from("occupancy").delete().eq("reservation_id", row.id);
      await db.from("reservations").delete().eq("id", row.id);
    }
  }
});
