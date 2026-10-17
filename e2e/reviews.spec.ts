import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, loginOwner, service } from "./helpers";

// Reviews (Z34): the owner's list and panel — publish now, reply, feature, reject with a reason.

const stamp = Date.now().toString(36);

test("owner publishes, replies, features and rejects a review", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  // A finished demo stay without a review (demo data: npm run demo-data).
  const { data: stays } = await db
    .from("reservations")
    .select("id, property_id, reviews(id)")
    .eq("tenant_id", TENANT)
    .eq("status", "completed")
    .limit(100);
  const stay = (stays ?? []).find((s) => !s.reviews?.length);
  test.skip(!stay, "no finished stay without a review — run npm run demo-data");
  const { data: module } = await db
    .from("tenant_modules")
    .select("status")
    .eq("tenant_id", TENANT)
    .eq("module_key", "reviews")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "reviews", status: "active", trial_ends_at: null });
  const name = `E2E ${stamp.slice(-4).toUpperCase()}.`;
  const { data: review } = await db
    .from("reviews")
    .insert({
      tenant_id: TENANT,
      property_id: stay!.property_id,
      reservation_id: stay!.id,
      rating: 3,
      rating_cleanliness: 4,
      body: `E2E recenzia ${stamp}`,
      display_name: name,
      stay_month: "2026-01-01",
    })
    .select("id")
    .single();
  const row = async () =>
    (
      await db
        .from("reviews")
        .select("status, reject_reason, owner_reply, featured")
        .eq("id", review!.id)
        .single()
    ).data;
  try {
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/reviews`);
    await expect(page.getByRole("heading", { level: 1, name: "Recenzie" })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(name) }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText(`E2E recenzia ${stamp}`)).toBeVisible();
    await expect(panel.getByText("Overená recenzia z pobytu")).toBeVisible();

    await panel.getByRole("button", { name: "Zverejniť teraz" }).click();
    await expect.poll(async () => (await row())?.status).toBe("published");

    await panel.getByRole("textbox", { name: "Verejná odpoveď" }).fill("Ďakujeme za návštevu.");
    await panel.getByRole("button", { name: "Uložiť odpoveď" }).click();
    await expect.poll(async () => (await row())?.owner_reply).toBe("Ďakujeme za návštevu.");

    await panel.getByRole("button", { name: "Dať navrch" }).click();
    await expect.poll(async () => (await row())?.featured).toBe(true);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

    await panel.getByRole("button", { name: "Zamietnuť" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("radio", { name: "Spam alebo reklama" }).click();
    await dialog.getByRole("button", { name: "Zamietnuť" }).click();
    await expect.poll(async () => (await row())?.status).toBe("rejected");
    expect((await row())?.reject_reason).toBe("spam");
    expect((await row())?.featured).toBe(false);
    const { count } = await db
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("kind", "guest_review_rejected")
      .eq("reservation_id", stay!.id);
    expect(count).toBe(1);
  } finally {
    await db
      .from("email_outbox")
      .delete()
      .eq("reservation_id", stay!.id)
      .like("kind", "guest_review%");
    await db.from("reviews").delete().eq("id", review!.id);
    await db
      .from("record_history")
      .delete()
      .eq("table_name", "reviews")
      .eq("record_id", review!.id);
    if (!module)
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "reviews");
    else
      await db
        .from("tenant_modules")
        .update({ status: module.status })
        .eq("tenant_id", TENANT)
        .eq("module_key", "reviews");
  }
});
