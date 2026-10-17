import { expect, test } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, TENANT_UNIT, TEST_DOMAIN, freeStay, service } from "./helpers";

test("guest account: login with a code, stays, payment, consent, cancellation, book again", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const email = `e2e-zone-${Date.now()}@${TEST_DOMAIN}`;
  const stay = await freeStay(2);
  const { error } = await db.rpc("create_reservation", {
    p: {
      tenant_id: TENANT,
      property_id: TENANT_PROPERTY,
      unit_id: TENANT_UNIT,
      guest_name: "Zóna Testová",
      guest_email: email,
      adults: 3,
      children: 1,
      currency: "EUR",
      total_cents: 140000,
      lines: [
        {
          kind: "accommodation",
          label: "Ubytovanie",
          quantity: 2,
          unit_amount_cents: 70000,
          amount_cents: 140000,
        },
      ],
      check_in: stay.checkIn,
      check_out: stay.checkOut,
    },
  });
  if (error) throw error;

  // Zone needs a login: code by e-mail (our e-mail system; test domain is never sent, so the test takes a fresh code).
  await page.goto(`${GUEST_URL}/ucet`);
  await page.waitForURL(/\/ucet\/prihlasenie/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Poslať kód" }).click();
  // Code boxes (08): pasting the whole code into the first box fills all of them.
  const firstDigit = page.getByLabel(/^Číslica 1 z/);
  await expect(firstDigit).toBeVisible();
  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
  await firstDigit.fill(link.properties!.email_otp);
  await page.getByRole("button", { name: "Prihlásiť sa" }).click();
  await page.waitForURL(/\/ucet$/);

  // Dashboard: the stay booked with this e-mail is there.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dobrý deň, Zóna");
  await expect(page.getByText("Najbližší pobyt")).toBeVisible();
  const rebook = page.getByRole("link", { name: "Rezervovať znova" }).first();
  await expect(rebook).toHaveAttribute("href", /adults=3&children=1/);

  // Marketing consent: one click on, one click off — both in the history.
  await page.getByRole("button", { name: "Chcem dostávať novinky" }).click();
  await expect(page.getByRole("button", { name: "Odhlásiť z noviniek" })).toBeVisible();
  await page.getByRole("button", { name: "Odhlásiť z noviniek" }).click();
  await expect(page.getByRole("button", { name: "Chcem dostávať novinky" })).toBeVisible();
  const { data: guest } = await db
    .from("guests")
    .select("id")
    .eq("tenant_id", TENANT)
    .eq("email", email)
    .single();
  const { count } = await db
    .from("guest_consent_events")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guest!.id);
  expect(count).toBe(2);

  // Detail: payment with QR, arrival instructions not yet, cancellation request.
  await page.getByRole("link", { name: "Detail pobytu" }).first().click();
  await expect(page.getByText("Platba prevodom")).toBeVisible();
  await expect(page.getByRole("img", { name: /PAY by square/ }).locator("svg")).toBeVisible();
  await expect(page.getByText(/Pokyny k príchodu a prístupové kódy uvidíte/)).toBeVisible();
  await page.getByRole("button", { name: "Požiadať o zrušenie" }).click();
  await expect(page.getByText("Žiadosť o zrušenie sme odoslali")).toBeVisible();

  // Sign out → zone asks for login again.
  await page.goto(`${GUEST_URL}/ucet`);
  await page.getByRole("button", { name: "Odhlásiť sa" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/ucet"));
  await page.goto(`${GUEST_URL}/ucet`);
  await page.waitForURL(/\/ucet\/prihlasenie/);
});
