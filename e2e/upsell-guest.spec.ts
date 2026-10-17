import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { service, TEST_DOMAIN } from "./helpers";

// Upsell for guests (Z37, linka B): the guest orders services in the stay behind the access link — on the stay
// account, with the owner's confirmation, cancels, and above the limit of the stay account pays by transfer.
// Runs on the Ukážkový klient (never on STRÖMY — real calendar), e-mails with "+b" on the test domain.

const UKAZKA = "a0000000-0000-4000-8000-000000000001";
const PROPERTY = "b0000000-0000-4000-8000-000000000006"; // Glamping Lúka
const UNIT = "c0000000-0000-4000-8000-000000000062"; // Stan Lesnica
const UKAZKA_URL = GUEST_URL.replace("://stromy.", "://ukazka.");
const stamp = Date.now().toString(36);
const db = service();

type Setup = { reservationId: string; token: string; services: Record<string, string> };

async function setup(): Promise<Setup> {
  const { data: settings } = await db
    .from("tenant_settings")
    .select("stay_account_limit_cents")
    .eq("tenant_id", UKAZKA)
    .single();
  const limit = settings?.stay_account_limit_cents ?? 30000;
  const base = {
    tenant_id: UKAZKA,
    property_id: PROPERTY,
    upsell_enabled: true,
    upsell_cutoff_hours: 24,
    upsell_requires_confirmation: false,
  };
  const { data: created, error: e1 } = await db
    .from("services")
    .insert([
      {
        ...base,
        name: { sk: `E2E raňajky ${stamp}` },
        price_model: "per_person_night",
        amount_cents: 1500,
      },
      {
        ...base,
        name: { sk: `E2E kuchár ${stamp}` },
        price_model: "per_person",
        amount_cents: 6500,
        upsell_requires_confirmation: true,
      },
      // Above the limit of the stay account — only payment now.
      {
        ...base,
        name: { sk: `E2E vírivka ${stamp}` },
        price_model: "per_stay",
        amount_cents: limit + 5000,
      },
    ])
    .select("id, name");
  if (e1) throw e1;
  const services = Object.fromEntries(
    created!.map((s) => [String((s.name as { sk: string }).sk.split(" ")[1]), s.id]),
  );
  // A free stay of 3 nights next autumn (retry when the unit is taken).
  const year = new Date().getUTCFullYear() + 1;
  for (let attempt = 0; attempt < 30; attempt++) {
    const start = new Date(Date.UTC(year, 9, 1 + Math.floor(Math.random() * 55)));
    const checkIn = start.toISOString().slice(0, 10);
    start.setUTCDate(start.getUTCDate() + 3);
    const checkOut = start.toISOString().slice(0, 10);
    const { data, error } = await db
      .rpc("create_reservation", {
        p: {
          tenant_id: UKAZKA,
          property_id: PROPERTY,
          unit_id: UNIT,
          guest_name: "E2E Hosť Upsell",
          guest_email: `e2e-upsell-${stamp}+b@${TEST_DOMAIN}`,
          adults: 2,
          currency: "EUR",
          total_cents: 45000,
          status: "confirmed",
          lines: [
            {
              kind: "accommodation",
              label: "Pobyt",
              quantity: 1,
              unit_amount_cents: 45000,
              amount_cents: 45000,
            },
          ],
          check_in: checkIn,
          check_out: checkOut,
        },
      })
      .single();
    if (!error) {
      const r = data as { id: string; access_token: string };
      return { reservationId: r.id, token: r.access_token, services };
    }
    if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`)) throw error;
  }
  throw new Error("No free stay found");
}

async function cleanup(s: Setup | null) {
  if (!s) return;
  const { data: orders } = await db
    .from("reservation_orders")
    .select("id")
    .eq("reservation_id", s.reservationId);
  await db.from("email_outbox").delete().eq("reservation_id", s.reservationId);
  await db.from("reservations").delete().eq("id", s.reservationId);
  await db.from("services").delete().in("id", Object.values(s.services));
  await db
    .from("record_history")
    .delete()
    .eq("tenant_id", UKAZKA)
    .in("record_id", [
      ...(orders ?? []).map((o) => o.id),
      ...Object.values(s.services),
      s.reservationId,
    ]);
}

const orders = async (reservationId: string, serviceId: string) =>
  (
    await db
      .from("reservation_orders")
      .select("id, status, payment_method, service_date, amount_cents")
      .eq("reservation_id", reservationId)
      .eq("service_id", serviceId)
      .order("service_date")
  ).data ?? [];

function row(page: Page, name: string) {
  return page.getByRole("button", { name: `Podrobnosti — ${name}` });
}

test("guest orders on the stay account, with confirmation, cancels and pays above the limit", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "the phone has its own test below");
  let s: Setup | null = null;
  try {
    s = await setup();
    await page.goto(`${UKAZKA_URL}/r/${s.token}`);
    await expect(
      page.getByRole("heading", { name: /K pobytu si môžete doobjednať/ }),
    ).toBeVisible();

    // Breakfast on two of three mornings, on the stay account: an order per day, 2 persons × 15 €.
    await row(page, `E2E raňajky ${stamp}`).click();
    const days = page.getByRole("group", { name: "Na ktoré dni" });
    const pills = days.getByRole("button");
    await expect(pills).toHaveCount(3);
    await pills.nth(1).click();
    await expect(
      page.getByRole("button", { name: "Na účet pobytu Zaplatíte pri odchode" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Objednať záväzne · 60,00/ }).click();
    await expect
      .poll(async () => (await orders(s!.reservationId, s!.services.raňajky!)).length)
      .toBe(2);
    const breakfast = await orders(s.reservationId, s.services.raňajky!);
    expect(breakfast.map((o) => [o.status, o.payment_method, o.amount_cents])).toEqual([
      ["confirmed", "stay_account", 3000],
      ["confirmed", "stay_account", 3000],
    ]);
    await expect(page.getByRole("region", { name: "Účet pobytu" })).toContainText("60,00");

    // The chef needs the owner's confirmation: one evening, nothing to pay until confirmed.
    await row(page, `E2E kuchár ${stamp}`).click();
    await expect(page.getByText(/Termín potvrdí .* do 24 hodín/)).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Na ktorý deň" }).getByRole("button", { pressed: true }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: /Objednať záväzne · 130,00/ }).click();
    await expect
      .poll(async () => (await orders(s!.reservationId, s!.services.kuchár!))[0]?.status)
      .toBe("awaiting_confirmation");
    await expect(page.getByText("Čaká na potvrdenie").first()).toBeVisible();

    // Cancel one breakfast until the cutoff.
    await row(page, `E2E raňajky ${stamp}`).click();
    await page.getByRole("button", { name: "Zrušiť objednávku" }).first().click();
    await page.getByRole("button", { name: "Áno, zrušiť" }).click();
    await expect
      .poll(async () =>
        (await orders(s!.reservationId, s!.services.raňajky!)).map((o) => o.status).sort(),
      )
      .toEqual(["cancelled", "confirmed"]);

    // Above the limit: "Na účet pobytu" is off, payment now by transfer with the QR code.
    await row(page, `E2E vírivka ${stamp}`).click();
    await expect(
      page.getByRole("button", { name: "Na účet pobytu Zaplatíte pri odchode" }),
    ).toBeDisabled();
    await expect(page.getByText(/Na účet pobytu môžete mať najviac/)).toBeVisible();
    await page.getByRole("button", { name: /Objednať záväzne/ }).click();
    await expect
      .poll(async () => (await orders(s!.reservationId, s!.services.vírivka!))[0]?.payment_method)
      .toBe("transfer");
    await expect(
      page.getByRole("heading", { name: "Zaplatiť objednané služby prevodom" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: /PAY by square/ }).last()).toBeVisible();

    // Contrast with the days and payment cards open (theme colours of the client).
    await row(page, `E2E raňajky ${stamp}`).click();
    // Only the parts of upsell (the stay card of the confirmation page is checked in confirm.spec).
    const axe = await new AxeBuilder({ page })
      .include('section[aria-labelledby="upsell-title"]')
      .include('section[aria-labelledby="upsell-pay"]')
      .include('section[aria-label="Účet pobytu"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  } finally {
    await cleanup(s);
  }
});

test("phone: a service opens in a bottom sheet, the stay account in the green strip", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "phone only");
  let s: Setup | null = null;
  try {
    s = await setup();
    await page.goto(`${UKAZKA_URL}/r/${s.token}`);
    await row(page, `E2E raňajky ${stamp}`).click();
    const sheet = page.getByRole("dialog", { name: `E2E raňajky ${stamp}` });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: /Objednať záväzne · 90,00/ }).click();
    await expect
      .poll(async () => (await orders(s!.reservationId, s!.services.raňajky!)).length)
      .toBe(3);
    await sheet.getByRole("button", { name: "Zavrieť" }).click();
    await page
      .getByRole("button", { name: /Účet pobytu/ })
      .last()
      .click();
    await expect(page.getByRole("dialog", { name: "Účet pobytu" })).toContainText("90,00");
  } finally {
    await cleanup(s);
  }
});
