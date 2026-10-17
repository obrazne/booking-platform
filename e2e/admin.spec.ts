import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import {
  TENANT,
  TENANT_PROPERTY,
  TENANT_UNIT,
  TEST_DOMAIN,
  freeStay,
  loginOwner,
  service,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test("owner: manual reservation, payment received, block, iCal conflict", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await loginOwner(page, ADMIN_URL);

  // Manual reservation waiting for payment.
  const stay = await freeStay(3);
  await page.goto(`${ADMIN_URL}/admin/reservations/new`);
  await page.locator("#unit_id").selectOption(TENANT_UNIT);
  await page.locator("#check_in").fill(stay.checkIn);
  await page.locator("#check_out").fill(stay.checkOut);
  await page.locator("#guest_name").fill("E2E Ručná");
  await page.locator("#guest_email").fill(`e2e-manual-${Date.now()}@${TEST_DOMAIN}`);
  await page.locator("#status").selectOption("pending_payment");
  await page.getByRole("button", { name: "Vytvoriť rezerváciu" }).click();
  await page.waitForURL(/panel=reservation:/);
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText("E2E Ručná");
  await expect(panel).toContainText("Čaká na platbu");

  // Payment received.
  await panel.getByRole("button", { name: "Platba prijatá" }).click();
  await expect(panel).toContainText("Potvrdená");
  const reservationId = new URL(page.url()).searchParams.get("panel")!.split(":")[1]!;

  // Owner block.
  const block = await freeStay(2, [stay.checkIn, stay.checkOut]);
  await page.goto(`${ADMIN_URL}/admin/blocks`);
  await page.getByRole("button", { name: "Pridať blokáciu" }).click();
  await page.locator("#unit_id").selectOption(TENANT_UNIT);
  await page.locator("#label").fill("E2E blokácia");
  await page.locator("#from").fill(block.checkIn);
  await page.locator("#to").fill(block.checkOut);
  await page.getByRole("button", { name: "Blokovať" }).click();
  await expect(page.getByText("E2E blokácia")).toBeVisible();

  // iCal event colliding with the reservation: stored as a non-blocking conflict, visible to the owner.
  const db = service();
  const { data: channel, error } = await db
    .from("ical_channels")
    .insert({
      tenant_id: TENANT,
      unit_id: TENANT_UNIT,
      name: "E2E kanál",
      source: "other",
      import_url: "https://example.com/e2e.ics",
      active: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: applyError } = await db.rpc("ical_apply", {
    p_channel_id: channel.id,
    p_events: [{ uid: "e2e-1", start: stay.checkIn, end: stay.checkOut, summary: "Reserved" }],
  });
  if (applyError) throw applyError;
  const { data: conflict } = await db
    .from("occupancy")
    .select("conflict, is_blocking")
    .eq("ical_channel_id", channel.id)
    .single();
  expect(conflict).toEqual({ conflict: true, is_blocking: false });
  await page.goto(`${ADMIN_URL}/admin/ical`);
  await expect(page.getByRole("button", { name: /E2E kanál/ })).toBeVisible();
  await expect(page.getByText("Kolízia").first()).toBeVisible();

  // Document for guests at the property (private storage, shown in the guest zone).
  await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/documents`);
  await page.getByLabel("Názov").fill("E2E poriadok");
  await page.getByLabel("Kedy ich hosť uvidí").selectOption("always");
  await page.getByLabel("Súbor").setInputFiles({
    name: "poriadok.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 1 0 obj<<>>endobj trailer<<>> %%EOF"),
  });
  // One button "Nahrať súbor": choosing the file uploads it.
  await expect(page.getByText("E2E poriadok")).toBeVisible();

  // The reservation itself is untouched by the conflict.
  const { data: r } = await db
    .from("reservations")
    .select("status")
    .eq("id", reservationId)
    .single();
  expect(r?.status).toBe("confirmed");
});
