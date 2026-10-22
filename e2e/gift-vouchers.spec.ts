import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import {
  PROPERTY_SLUG,
  TENANT,
  TEST_DOMAIN,
  freeStay,
  loginOwner,
  markToursSeen,
  pickStay,
  service,
} from "./helpers";

// Darčekové poukazy (Z78, linka B) on the Ukážkový klient: the owner makes a voucher (Ponuka › Poukazy), downloads its
// PDF; the guest pays part of the stay with it in the cart (the rest by transfer); the voucher shows where it was used
// and a cancellation returns the amount. The voucher and the reservation are removed at the end.

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

test("gift voucher: made by the owner, PDF, paid with in the cart, returned on cancel", async ({
  page,
}) => {
  const db = service();
  const stamp = Date.now().toString(36);
  const recipient = `E2E Poukaz ${stamp}`;
  const email = `e2e-poukaz-${stamp}+b@${TEST_DOMAIN}`;
  try {
    // 1) The owner makes a voucher of 50 €.
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/vouchers`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Poukazy");
    await page.getByRole("button", { name: "Nový poukaz" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Hodnota (€)").fill("50");
    await dialog.getByLabel("Na meno").fill(recipient);
    await dialog.getByLabel("Poznámka pre tím").fill("e2e");
    await noSeriousA11y(page, '[role="dialog"]');
    await dialog.getByRole("button", { name: "Vytvoriť poukaz" }).click();
    await expect(dialog).toHaveCount(0);
    const { data: v } = await db
      .from("gift_vouchers")
      .select("id, code, balance_cents")
      .eq("tenant_id", TENANT)
      .eq("recipient_name", recipient)
      .single();
    expect(v!.balance_cents).toBe(5000);
    expect(v!.code).toMatch(/^[A-Z0-9]{1,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // The list shows it as valid; its card has the PDF.
    await page.getByPlaceholder("Kód alebo meno…").fill(v!.code);
    await page.keyboard.press("Enter");
    // The search writes the address first; the row is clicked after that (else the panel is replaced).
    await page.waitForURL(/[?&]q=/);
    const row = page.getByRole("row").filter({ hasText: v!.code });
    await expect(row).toContainText("Platný");
    await row.click();
    await page.waitForURL(/panel=voucher/);
    await expect(page.getByText("Zatiaľ nepoužitý.")).toBeVisible();
    await noSeriousA11y(page, "main");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Stiahnuť PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`poukaz-${v!.code}.pdf`);
    const stream = await download.createReadStream();
    const first = await new Promise<Buffer>((resolve) =>
      stream.once("data", (c) => resolve(Buffer.from(c))),
    );
    expect(first.subarray(0, 4).toString()).toBe("%PDF");

    // 2) The guest pays part of the stay with it.
    const stay = await freeStay(2);
    await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
    const calendar = page.locator("#termin");
    await calendar.scrollIntoViewIfNeeded();
    await pickStay(calendar, stay.checkIn, stay.checkOut);
    const cart = page.getByRole("dialog");
    await cart.getByRole("button", { name: "Pokračovať" }).filter({ visible: true }).click();
    await cart.locator("#c-name").fill("E2E Poukaz Hosť");
    await cart.locator("#c-email").fill(email);
    await cart
      .getByRole("button", { name: "Skontrolovať a zaplatiť" })
      .filter({ visible: true })
      .click();
    await cart.getByRole("button", { name: "Máte darčekový poukaz?" }).click();
    await cart.getByLabel("Kód darčekového poukazu").fill("NEEXISTUJE-AAAA-AAAA");
    await cart.getByRole("button", { name: "Použiť" }).last().click();
    await expect(cart.getByText(/Tento poukaz nepoznáme/)).toBeVisible();
    await cart.getByLabel("Kód darčekového poukazu").fill(v!.code.toLowerCase());
    await cart.getByRole("button", { name: "Použiť" }).last().click();
    const applied = cart.getByTestId("gift-applied");
    await expect(applied).toContainText(`Poukaz ${v!.code} zaplatí 50`);
    await expect(applied).toContainText("Zostáva uhradiť");
    await noSeriousA11y(page, '[role="dialog"]');
    await cart.getByRole("checkbox", { name: /obchodnými podmienkami/ }).check();
    await cart.getByRole("checkbox", { name: /storno podmienky/ }).check();
    await page.waitForTimeout(3200);
    await cart.getByRole("button", { name: "Rezervovať s povinnosťou platby" }).click();
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]+/);

    const { data: r } = await db
      .from("reservations")
      .select("id, status, total_cents")
      .eq("guest_email", email)
      .single();
    expect(r!.status).toBe("pending_payment");
    const { data: pays } = await db
      .from("payments")
      .select("provider, status, amount_cents")
      .eq("reservation_id", r!.id)
      .order("provider");
    expect(pays).toEqual([
      { provider: "bank_transfer", status: "pending", amount_cents: r!.total_cents - 5000 },
      { provider: "gift_voucher", status: "received", amount_cents: 5000 },
    ]);
    // The QR is for the rest only.
    await expect(page.getByRole("img", { name: /PAY by square/ }).first()).toBeVisible();

    // 3) The voucher shows where it was used; a cancellation returns the amount.
    await page.goto(`${ADMIN_URL}/admin/vouchers?panel=voucher:${v!.id}`);
    await expect(page.getByTestId("voucher-uses")).toContainText(/E2E Poukaz Hosť/);
    await db.from("reservations").update({ status: "cancelled" }).eq("id", r!.id);
    const { data: back } = await db
      .from("gift_vouchers")
      .select("balance_cents")
      .eq("id", v!.id)
      .single();
    expect(back!.balance_cents).toBe(5000);
  } finally {
    const { data: rows } = await db.from("reservations").select("id").eq("guest_email", email);
    for (const row of rows ?? []) {
      await db.from("gift_voucher_uses").delete().eq("reservation_id", row.id);
      await db.from("email_outbox").delete().eq("reservation_id", row.id);
      await db.from("occupancy").delete().eq("reservation_id", row.id);
      await db.from("payments").delete().eq("reservation_id", row.id);
      await db.from("reservations").delete().eq("id", row.id);
    }
    await db.from("gift_vouchers").delete().eq("tenant_id", TENANT).eq("recipient_name", recipient);
  }
});
