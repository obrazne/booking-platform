import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { freeStay, service, STROMY, STROMY_UNIT, TEST_DOMAIN } from "./helpers";

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("confirmation page v2.1: waiting for payment, then confirmed; calendar file", async ({
  page,
  context,
}, info) => {
  const db = service();
  const stay = await freeStay(3);
  const { data, error } = await db.rpc("create_reservation", {
    p: {
      tenant_id: STROMY,
      property_id: "b0000000-0000-4000-8000-000000000100",
      unit_id: STROMY_UNIT,
      guest_name: "Peter Testovací",
      guest_email: `e2e-confirm-${info.project.name}-${Date.now()}@${TEST_DOMAIN}`,
      adults: 4,
      currency: "EUR",
      total_cents: 210000,
      lines: [
        {
          kind: "accommodation",
          label: "Celoročne",
          quantity: 3,
          unit_amount_cents: 70000,
          amount_cents: 210000,
        },
      ],
      check_in: stay.checkIn,
      check_out: stay.checkOut,
    },
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; access_token: string };
  const url = `${GUEST_URL}/r/${row.access_token}`;

  // Waiting for payment: first name, the client's own header and footer, payment details with Copy, QR, steps.
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ďakujeme, Peter.");
  await expect(page.getByRole("link", { name: /Môj účet/ })).toBeVisible();
  await expect(page.locator("footer")).toContainText("Chalet STRÖMY");
  await expect(page.getByRole("img", { name: /PAY by square/ })).toBeVisible();
  await expect(page.locator("ol li[aria-current='step']")).toContainText("Zaplatíte");
  if (info.project.name === "desktop") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Kopírovať: IBAN" }).click();
    await expect(page.getByRole("button", { name: "Kopírovať: IBAN" })).toContainText(
      "Skopírované",
    );
  } else {
    // Phones: the details with Copy come before the QR, and the QR can be saved.
    const ibanY = (await page.getByRole("button", { name: "Kopírovať: IBAN" }).boundingBox())!.y;
    const qrY = (await page.getByRole("img", { name: /PAY by square/ }).boundingBox())!.y;
    expect(ibanY).toBeLessThan(qrY);
    await expect(page.getByRole("link", { name: "Uložiť QR" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  }
  await noSeriousA11y(page);

  // "Add to calendar": one all-day event; approximate location → no street.
  // (fetched in the browser — *.localhost resolves there, not in Node)
  const { type, body } = await page.evaluate(async (u) => {
    const res = await fetch(u);
    return { type: res.headers.get("content-type") ?? "", body: await res.text() };
  }, `${url}/ics`);
  expect(type).toContain("text/calendar");
  expect(body).toContain(`DTSTART;VALUE=DATE:${stay.checkIn.replaceAll("-", "")}`);
  expect(body).not.toContain("Do doliny");

  // Payment received → confirmed: thanks with the name, green strip, no QR.
  await db
    .from("payments")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("reservation_id", row.id);
  await db.from("reservations").update({ status: "confirmed" }).eq("id", row.id);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tešíme sa na vás, Peter.");
  await expect(page.getByText(/Platba .* prijatá/)).toBeVisible();
  await expect(page.getByRole("img", { name: /PAY by square/ })).toHaveCount(0);
  await expect(page.locator("ol li[aria-current='step']")).toContainText("Pokyny k príchodu");
  await noSeriousA11y(page);
});
