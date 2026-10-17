import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { service, TENANT, TEST_DOMAIN } from "./helpers";

// States of the stay page in the guest account (Z44, linka B): waiting for payment, before arrival with a request to
// cancel, during the stay (unlocked tiles), cancelled. Ukážkový klient only (never STRÖMY), e-mails "+b".

const PROPERTY = "b0000000-0000-4000-8000-000000000006"; // Glamping Lúka
const UNITS = [
  "c0000000-0000-4000-8000-000000000060",
  "c0000000-0000-4000-8000-000000000061",
  "c0000000-0000-4000-8000-000000000062",
];
const UKAZKA_URL = GUEST_URL.replace("://stromy.", "://ukazka.");
const db = service();
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** A reservation of the guest on any free glamping unit, starting `offset` days from today (or a random later day). */
async function stay(
  email: string,
  status: "pending_payment" | "confirmed",
  offsets: number[],
): Promise<{ id: string; number: string }> {
  for (const offset of offsets)
    for (const unit of UNITS) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      const checkIn = iso(d);
      d.setUTCDate(d.getUTCDate() + 2);
      const { data, error } = await db
        .rpc("create_reservation", {
          p: {
            tenant_id: TENANT,
            property_id: PROPERTY,
            unit_id: unit,
            guest_name: "Stav Testová",
            guest_email: email,
            adults: 2,
            currency: "EUR",
            total_cents: 30000,
            status,
            lines: [
              {
                kind: "accommodation",
                label: "Ubytovanie",
                quantity: 2,
                unit_amount_cents: 15000,
                amount_cents: 30000,
              },
            ],
            check_in: checkIn,
            check_out: iso(d),
          },
        })
        .single();
      if (!error) {
        const id = (data as { id: string }).id;
        const { data: r } = await db.from("reservations").select("number").eq("id", id).single();
        return { id, number: r!.number };
      }
      if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`)) throw error;
    }
  throw new Error("No free stay found");
}

async function login(page: Page, email: string) {
  await page.goto(`${UKAZKA_URL}/ucet`);
  await page.waitForURL(/\/ucet\/prihlasenie/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Poslať kód" }).click();
  const firstDigit = page.getByLabel(/^Číslica 1 z/);
  await expect(firstDigit).toBeVisible();
  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
  await firstDigit.fill(link.properties!.email_otp);
  await page.getByRole("button", { name: "Prihlásiť sa" }).click();
  await page.waitForURL(/\/ucet$/);
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const serious = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("stay page follows its state; the guest asks to cancel before arrival", async ({
  page,
}, info) => {
  test.slow();
  const email = `e2e-states-${Date.now().toString(36)}-${info.project.name}+b@${TEST_DOMAIN}`;
  const ids: string[] = [];
  // The property's private data and setting as they were (restored in finally, also after a failure).
  const { data: before0 } = await db
    .from("properties")
    .select("checkin_required_for_instructions")
    .eq("id", PROPERTY)
    .single();
  const { data: hadPrivate } = await db
    .from("property_private")
    .select("arrival_instructions, door_code, wifi_name, wifi_password")
    .eq("property_id", PROPERTY)
    .maybeSingle();
  const { data: settings0 } = await db
    .from("tenant_settings")
    .select("cancellation_bands")
    .eq("tenant_id", TENANT)
    .single();
  try {
    // Storno bands as the demo client's wording ("do 14 dní pred príchodom zdarma, potom 50 %").
    await db
      .from("tenant_settings")
      .update({
        cancellation_bands: [
          { days: 14, refund_pct: 100 },
          { days: 0, refund_pct: 50 },
        ],
      })
      .eq("tenant_id", TENANT);
    await db
      .from("properties")
      .update({ checkin_required_for_instructions: false })
      .eq("id", PROPERTY);
    await db.from("property_private").upsert({
      tenant_id: TENANT,
      property_id: PROPERTY,
      arrival_instructions: { sk: "E2E: parkovanie pri stane, kľúče v schránke." },
      door_code: "4719#",
      wifi_name: "E2E-guest",
      wifi_password: "lesnyvzduch",
    });
    const later = Array.from({ length: 20 }, () => 300 + Math.floor(Math.random() * 200));
    const pending = await stay(email, "pending_payment", later);
    const before = await stay(email, "confirmed", later);
    const during = await stay(email, "confirmed", [0, -1]);
    const cancelled = await stay(email, "confirmed", later);
    ids.push(pending.id, before.id, during.id, cancelled.id);
    const { error: cancelError } = await db.rpc("change_reservation_status", {
      p_reservation_id: cancelled.id,
      p_to: "cancelled",
      p_actor: null,
      p_reason: "Na žiadosť hosťa",
    } as never);
    if (cancelError) throw cancelError;

    await db
      .from("payments")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("reservation_id", before.id)
      .eq("purpose", "reservation");
    await login(page, email);

    // Waiting for payment: the payment card on top, ordering after payment, "Na zaplatenie" in the stay account.
    await page.goto(`${UKAZKA_URL}/ucet/pobyt/${pending.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ešte jeden krok.");
    await expect(page.getByText("Ak platba nepríde včas, rezervácia sa sama zruší")).toBeVisible();
    await expect(page.getByRole("img", { name: /PAY by square/ })).toBeVisible();
    await expect(page.getByText("Odomknú sa", { exact: false }).first()).toContainText(
      "keď bude pobyt zaplatený",
    );
    const account = page.getByRole("region", { name: "Účet pobytu" });
    await expect(account).toContainText("Na zaplatenie");
    await account.getByText("Rozpis ceny").click();
    await expect(account).toContainText("Ubytovanie");
    await expect(page.getByRole("heading", { name: "Rozpis ceny" })).toHaveCount(0);
    await axe(page);

    // During the stay: tiles from the property's data, instructions, navigation/contact.
    await page.goto(`${UKAZKA_URL}/ucet/pobyt/${during.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vitajte.");
    await expect(page.getByText("4719#")).toBeVisible();
    await expect(page.getByText("E2E-guest")).toBeVisible();
    await expect(page.getByText("heslo: lesnyvzduch")).toBeVisible();
    await expect(page.getByText("E2E: parkovanie pri stane")).toBeVisible();
    await expect(page.getByRole("button", { name: "Požiadať o zrušenie pobytu" })).toHaveCount(0);
    await axe(page);

    // Cancelled: when, no modules, a new date.
    await page.goto(`${UKAZKA_URL}/ucet/pobyt/${cancelled.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mrzí nás to.");
    await expect(page.getByRole("heading", { name: "Pobyt je zrušený." })).toBeVisible();
    await expect(page.getByText("Dôvod: Na žiadosť hosťa")).toBeVisible();
    await expect(page.getByText("K pobytu si môžete doobjednať")).toHaveCount(0);

    // Before arrival: the window with the policy, a reason, the request reaches the owner.
    await page.goto(`${UKAZKA_URL}/ucet/pobyt/${before.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tešíme sa na vás.");
    await page.getByRole("button", { name: "Požiadať o zrušenie pobytu" }).click();
    const dialog = page.getByRole("dialog", { name: "Požiadať o zrušenie?" });
    await expect(dialog).toContainText("Do príchodu");
    // Paid in full, long before arrival → everything back by the bands.
    await expect(dialog).toContainText("vrátime 300,00 € (100 % ceny)");
    await axe(page);
    await dialog.getByRole("button", { name: "Ponechať pobyt" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Požiadať o zrušenie pobytu" }).click();
    await dialog.getByLabel(/Dôvod/).fill("Choroba v rodine.");
    await dialog.getByRole("button", { name: "Odoslať žiadosť" }).click();
    await expect(page.getByText(/Žiadosť o zrušenie ste poslali/)).toBeVisible();
    const { data: requested } = await db
      .from("reservations")
      .select("cancellation_requested_at, cancellation_request_note, status")
      .eq("id", before.id)
      .single();
    expect(requested?.cancellation_request_note).toBe("Choroba v rodine.");
    expect(requested?.status).toBe("confirmed");
  } finally {
    if (ids.length) {
      await db.from("email_outbox").delete().in("reservation_id", ids);
      await db
        .from("notifications")
        .delete()
        .eq("tenant_id", TENANT)
        .or(ids.map((id) => `dedupe_key.like.*${id}*`).join(","));
      await db.from("reservations").delete().in("id", ids);
      await db.from("record_history").delete().eq("tenant_id", TENANT).in("record_id", ids);
    }
    await db
      .from("tenant_settings")
      .update({ cancellation_bands: settings0?.cancellation_bands ?? [] })
      .eq("tenant_id", TENANT);
    if (hadPrivate)
      await db.from("property_private").update(hadPrivate).eq("property_id", PROPERTY);
    else await db.from("property_private").delete().eq("property_id", PROPERTY);
    await db
      .from("properties")
      .update({
        checkin_required_for_instructions: before0?.checkin_required_for_instructions ?? false,
      })
      .eq("id", PROPERTY);
  }
});
