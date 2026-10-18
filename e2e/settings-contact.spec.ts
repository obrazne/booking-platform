import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Nastavenia → Kontakt (Z60, linka B): the contact for guests and the signature of messages ({podpis}) are saved.
// Ukážkový klient only; the values are put back.

test("contact and signature of messages are saved in Nastavenia → Kontakt", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: before } = await db
    .from("tenant_settings")
    .select("contact_name, contact_phone, whatsapp_phone, message_signature")
    .eq("tenant_id", TENANT)
    .single();
  const stamp = Date.now().toString(36);
  try {
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/settings#kontakt`);
    await page.getByLabel("Podpis správ").fill(`Jana · Ukážka ${stamp}\n+421 900 000 000`);
    await page.getByLabel("Kontaktná osoba").fill(`Jana ${stamp}`);
    await page.getByRole("button", { name: "Uložiť" }).last().click();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("tenant_settings")
          .select("contact_name, message_signature")
          .eq("tenant_id", TENANT)
          .single();
        return data;
      })
      .toEqual({
        contact_name: `Jana ${stamp}`,
        message_signature: `Jana · Ukážka ${stamp}\n+421 900 000 000`,
      });
  } finally {
    if (before) await db.from("tenant_settings").update(before).eq("tenant_id", TENANT);
  }
});
