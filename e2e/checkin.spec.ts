import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

// Online check-in (Z36): the panel shows persons masked, the owner reveals (audited), prints the form of a foreigner
// and marks the report; Príchody with the tax for accommodation.

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function moduleOn() {
  const db = service();
  const { data } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "checkin")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "checkin", status: "active", trial_ends_at: null });
  return async () => {
    if (data)
      await db
        .from("tenant_modules")
        .update(data)
        .eq("tenant_id", TENANT)
        .eq("module_key", "checkin");
    else
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "checkin");
  };
}

test("owner reveals a document, prints the form and marks the report", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const restore = await moduleOn();
  const stay = await freeStay(3);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: TENANT,
        property_id: TENANT_PROPERTY,
        unit_id: TENANT_UNIT,
        guest_name: "E2E Check-in",
        guest_email: `e2e-checkin-${stamp}@${TEST_DOMAIN}`,
        adults: 2,
        currency: "EUR",
        total_cents: 60000,
        status: "confirmed",
        lines: [
          {
            kind: "accommodation",
            label: "Pobyt",
            quantity: 1,
            unit_amount_cents: 60000,
            amount_cents: 60000,
          },
        ],
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      },
    })
    .single();
  if (error) throw error;
  const res = created as { id: string };
  try {
    await db.from("checkins").insert({
      tenant_id: TENANT,
      reservation_id: res.id,
      status: "completed",
      arrival_time: "17:00",
      house_rules_accepted_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      completed_via: "link",
    });
    const { data: people } = await db
      .from("checkin_guests")
      .insert([
        {
          tenant_id: TENANT,
          reservation_id: res.id,
          sort: 0,
          first_name: "Eva",
          last_name: "Testová",
          is_citizen: true,
          nationality: "SK",
          birth_date: null,
          document_type: "id_card",
          document_number: "EA998877",
          address: "Testovacia 1, Poprad",
        },
        {
          tenant_id: TENANT,
          reservation_id: res.id,
          sort: 1,
          first_name: "John",
          last_name: "Test",
          is_citizen: false,
          nationality: "GB",
          birth_date: "1980-05-01",
          document_type: "passport",
          document_number: "P1234545",
          address: "1 Test Street, London",
        },
      ])
      .select("id, last_name");
    const john = people!.find((p) => p.last_name === "Test")!;

    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/reservations?panel=reservation:${res.id}`);
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("heading", { name: "Check-in", exact: true })).toBeVisible();
    await expect(panel.getByText("Dokončený")).toBeVisible();
    await expect(panel.getByText("••••45")).toBeVisible();
    await expect(panel.getByText("P1234545")).toHaveCount(0);

    await panel.getByRole("button", { name: "Odkryť doklad — John Test" }).click();
    await expect(panel.getByText(/P1234545/)).toBeVisible();
    const { count } = await db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "checkin.revealed")
      .eq("entity_id", john.id);
    expect(count).toBe(1);

    const pdf = await page.request.get(`${ADMIN_URL}/admin/arrivals/report/${john.id}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

    await panel.getByRole("button", { name: "Označiť ako nahlásené" }).click();
    await expect
      .poll(
        async () =>
          (await db.from("checkin_guests").select("reported_at").eq("id", john.id).single()).data
            ?.reported_at,
      )
      .not.toBeNull();
    await noSeriousA11y(page);
  } finally {
    await db.from("reservations").delete().eq("id", res.id);
    await db
      .from("audit_log")
      .delete()
      .eq("action", "checkin.revealed")
      .filter("data->>reservation_id", "eq", res.id);
    await restore();
  }
});

test("Príchody list arrivals and the tax for accommodation", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const restore = await moduleOn();
  try {
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/arrivals`);
    await expect(page.getByRole("heading", { level: 1, name: "Príchody" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Daň za ubytovanie" })).toBeVisible();
    const month = new Date().toISOString().slice(0, 7);
    const csv = await page.request.get(`${ADMIN_URL}/admin/arrivals/tax?month=${month}`);
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Rezervácia");
    await noSeriousA11y(page);
  } finally {
    await restore();
  }
});
