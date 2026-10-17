import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import {
  freeStay,
  loginOwner,
  markToursSeen,
  service,
  TENANT,
  TENANT_PROPERTY,
  TENANT_UNIT,
  TEST_DOMAIN,
} from "./helpers";

// Messages in the administration (Z46, linka B): the guest wrote → Správy › Schránka "Čakajú na odpoveď" → the row
// opens the reservation panel on the tab Správy → a quick reply is sent, a scheduled automatic message is left out
// → Automatické správy: a rule is edited (and put back). Ukážkový klient only (never STRÖMY), e-mails "+b".

async function noSeriousA11y(page: Page, include?: string) {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) axe = axe.include(include);
  const r = await axe.analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("owner answers from the inbox with a quick reply, leaves out a scheduled message, edits a rule", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const stamp = Date.now().toString(36);
  const guest = `E2E Správy ${stamp}`;
  const { data: module } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "messages")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "messages", status: "active", trial_ends_at: null });
  let reservationId: string | null = null;
  let quickId: string | null = null;
  let rule: Record<string, unknown> | null = null;
  try {
    const stay = await freeStay(3);
    const { data: created, error } = await db
      .rpc("create_reservation", {
        p: {
          tenant_id: TENANT,
          property_id: TENANT_PROPERTY,
          unit_id: TENANT_UNIT,
          guest_name: guest,
          guest_email: `e2e-messages-admin-${stamp}+b@${TEST_DOMAIN}`,
          adults: 2,
          currency: "EUR",
          total_cents: 50000,
          status: "confirmed",
          lines: [
            {
              kind: "accommodation",
              label: "Pobyt",
              quantity: 1,
              unit_amount_cents: 50000,
              amount_cents: 50000,
            },
          ],
          check_in: stay.checkIn,
          check_out: stay.checkOut,
        },
      })
      .single();
    if (error) throw error;
    reservationId = (created as { id: string }).id;
    await db.from("messages").insert({
      tenant_id: TENANT,
      reservation_id: reservationId,
      sender: "guest",
      body: `E2E otázka ${stamp}`,
    });
    const { data: quick, error: e2 } = await db
      .from("quick_replies")
      .insert({
        tenant_id: TENANT,
        title: `E2E rýchla ${stamp}`,
        body: `E2E odpoveď ${stamp}`,
        sort: -1,
      })
      .select("id")
      .single();
    if (e2) throw e2;
    quickId = quick.id;

    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    // The first visit adds the default rules of a client that has none.
    await page.goto(`${ADMIN_URL}/admin/messages?filter=waiting`);
    await expect(page.getByRole("heading", { level: 1, name: "Správy" })).toBeVisible();
    const row = page.getByRole("link", { name: new RegExp(guest) });
    await expect(row).toContainText(`E2E otázka ${stamp}`);
    await noSeriousA11y(page);
    await row.click();
    await expect(page).toHaveURL(/tab=messages/);
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("tab", { name: /Správy/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(panel.getByText(`E2E otázka ${stamp}`)).toBeVisible();

    // Quick reply → send.
    await panel.getByRole("button", { name: "Rýchle odpovede" }).click();
    await panel.getByRole("menuitem", { name: new RegExp(`E2E rýchla ${stamp}`) }).click();
    await expect(panel.getByRole("textbox", { name: "Odpoveď hosťovi" })).toHaveValue(
      `E2E odpoveď ${stamp}`,
    );
    await panel.getByRole("button", { name: "Odoslať" }).click();
    await expect(panel.getByRole("textbox", { name: "Odpoveď hosťovi" })).toHaveValue("");
    await expect
      .poll(async () => {
        const { data } = await db
          .from("messages")
          .select("sender")
          .eq("reservation_id", reservationId!)
          .eq("body", `E2E odpoveď ${stamp}`);
        return data?.map((m) => m.sender) ?? [];
      })
      .toEqual(["staff"]);
    const { data: thread } = await db
      .from("message_threads")
      .select("team_read_at")
      .eq("reservation_id", reservationId)
      .single();
    expect(thread?.team_read_at).not.toBeNull();

    // A scheduled automatic message is left out for this guest, then put back.
    await panel.getByRole("button", { name: "Neposielať" }).first().click();
    await expect(panel.getByRole("button", { name: "Vrátiť" })).toBeVisible();
    const { count: skipped } = await db
      .from("message_overrides")
      .select("rule_id", { count: "exact", head: true })
      .eq("reservation_id", reservationId)
      .eq("skip", true);
    expect(skipped).toBe(1);
    await noSeriousA11y(page, '[role="dialog"]');
    await panel.getByRole("button", { name: "Vrátiť" }).click();
    await expect(panel.getByRole("button", { name: "Vrátiť" })).toHaveCount(0);

    // Automatické správy: edit the text of the first rule.
    await page.goto(`${ADMIN_URL}/admin/messages/auto`);
    await expect(page.getByRole("heading", { level: 1, name: "Automatické správy" })).toBeVisible();
    await noSeriousA11y(page);
    const edit = page.getByRole("button", { name: /^Upraviť: / }).first();
    const name = (await edit.getAttribute("aria-label"))!.replace(/^Upraviť: /, "");
    const { data: original } = await db
      .from("message_rules")
      .select("id, name, body, anchor, offset_days, send_time")
      .eq("tenant_id", TENANT)
      .eq("name->>sk", name)
      .single();
    rule = original;
    await edit.click();
    const editor = page.getByRole("dialog");
    await expect(editor).toHaveCSS("opacity", "1");
    const text = editor.getByRole("textbox", { name: "Text" });
    await text.fill(`E2E text ${stamp} pre {meno}`);
    await expect(editor).toContainText(`E2E text ${stamp} pre Tomáš`);
    await noSeriousA11y(page, '[role="dialog"]');
    await editor.getByRole("button", { name: "Uložiť" }).click();
    await expect(page.getByText("Uložené.")).toBeVisible();
    const { data: saved } = await db
      .from("message_rules")
      .select("body")
      .eq("id", original!.id)
      .single();
    expect((saved?.body as Record<string, string>).sk).toBe(`E2E text ${stamp} pre {meno}`);
  } finally {
    if (rule) {
      const { id, ...back } = rule;
      await db
        .from("message_rules")
        .update(back)
        .eq("id", id as string);
    }
    if (quickId) await db.from("quick_replies").delete().eq("id", quickId);
    if (reservationId) await db.from("reservations").delete().eq("id", reservationId);
    if (module)
      await db
        .from("tenant_modules")
        .update(module)
        .eq("tenant_id", TENANT)
        .eq("module_key", "messages");
    else
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "messages");
  }
});
