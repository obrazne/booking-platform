import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { freeStay, loginOwner, service, STROMY, STROMY_UNIT, TEST_DOMAIN } from "./helpers";

// Upsell (Z35): orders after the reservation in the reservation panel — confirm, decline with a reason, settle.

const stamp = Date.now().toString(36);

test("owner confirms, declines and settles orders on the stay account", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: before } = await db
    .from("tenant_modules")
    .select("module_key, status, trial_ends_at")
    .eq("tenant_id", STROMY)
    .in("module_key", ["services", "upsell"]);
  for (const key of ["services", "upsell"])
    await db
      .from("tenant_modules")
      .upsert({ tenant_id: STROMY, module_key: key, status: "active", trial_ends_at: null });
  const { data: services } = await db
    .from("services")
    .insert([
      {
        tenant_id: STROMY,
        name: { sk: `E2E raňajky ${stamp}` },
        price_model: "per_stay",
        amount_cents: 2000,
        upsell_enabled: true,
        upsell_requires_confirmation: false,
      },
      {
        tenant_id: STROMY,
        name: { sk: `E2E kuchár ${stamp}` },
        price_model: "per_item",
        amount_cents: 5000,
        upsell_enabled: true,
        upsell_requires_confirmation: true,
      },
    ])
    .select("id, name");
  const [breakfast, chef] = services!;
  const stay = await freeStay(3);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: STROMY,
        property_id: "b0000000-0000-4000-8000-000000000100",
        unit_id: STROMY_UNIT,
        guest_name: "E2E Upsell",
        guest_email: `e2e-upsell-${stamp}@${TEST_DOMAIN}`,
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
  const res = created as { id: string; access_token: string };
  try {
    for (const s of [breakfast!, chef!]) {
      const { error: e } = await db.rpc("place_order", {
        p_reservation_id: res.id,
        p_service_id: s.id,
        p_items: 1,
        p_payment_method: "stay_account",
        p_token: res.access_token,
      });
      if (e) throw e;
    }
    const order = async (serviceId: string) =>
      (
        await db
          .from("reservation_orders")
          .select("status, paid_at, decline_reason")
          .eq("reservation_id", res.id)
          .eq("service_id", serviceId)
          .single()
      ).data;

    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/reservations?panel=reservation:${res.id}`);
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("heading", { name: "Účet pobytu" })).toBeVisible();
    await expect(panel.getByText("Čaká na potvrdenie")).toBeVisible();

    await panel.getByRole("button", { name: `Potvrdiť — E2E kuchár ${stamp}` }).click();
    await expect.poll(async () => (await order(chef!.id))?.status).toBe("confirmed");

    await panel.getByRole("button", { name: `Zamietnuť — E2E raňajky ${stamp}` }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("textbox", { name: "Dôvod" }).fill("Raňajky v tento deň nepodávame.");
    await dialog.getByRole("button", { name: "Zamietnuť" }).click();
    await expect.poll(async () => (await order(breakfast!.id))?.status).toBe("declined");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

    await panel.getByRole("button", { name: "Vyúčtovať" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Na mieste" }).click();
    await expect.poll(async () => (await order(chef!.id))?.paid_at).not.toBeNull();
    const { data: payment } = await db
      .from("payments")
      .select("amount_cents, provider, status")
      .eq("reservation_id", res.id)
      .eq("purpose", "stay_account")
      .single();
    expect(payment).toEqual({ amount_cents: 5000, provider: "on_site", status: "received" });
  } finally {
    const { data: orders } = await db
      .from("reservation_orders")
      .select("id")
      .eq("reservation_id", res.id);
    await db.from("reservations").delete().eq("id", res.id);
    await db
      .from("services")
      .delete()
      .in(
        "id",
        services!.map((s) => s.id),
      );
    await db
      .from("record_history")
      .delete()
      .eq("tenant_id", STROMY)
      .in("table_name", ["reservation_orders", "services"])
      .in(
        "record_id",
        [...(orders ?? []), ...services!].map((r) => r.id),
      );
    for (const key of ["services", "upsell"]) {
      const row = before?.find((b) => b.module_key === key);
      if (row)
        await db
          .from("tenant_modules")
          .update({ status: row.status, trial_ends_at: row.trial_ends_at })
          .eq("tenant_id", STROMY)
          .eq("module_key", key);
      else await db.from("tenant_modules").delete().eq("tenant_id", STROMY).eq("module_key", key);
    }
  }
});
