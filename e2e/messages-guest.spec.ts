import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { freeStay, service, TENANT, TENANT_PROPERTY, TENANT_UNIT, TEST_DOMAIN } from "./helpers";

// Messages for guests (Z47): the owner's message is unread (overview point, badge), the guest reads and answers in
// the stay (phones: the conversation on its own screen), the owner gets it (message + notification); the e-mail link
// opens the conversation without a password. Demo client only.

async function noSeriousA11y(page: Page, include?: string) {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) axe = axe.include(include);
  const r = await axe.analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("guest reads the owner's message, answers, the owner gets it; e-mail link opens the conversation", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const db = service();
  const stamp = `${info.project.name}-${Date.now()}`;
  const email = `e2e-messages-${stamp}@${TEST_DOMAIN}`;
  const { data: module } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "messages")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "messages", status: "active", trial_ends_at: null });
  const stay = await freeStay(3);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: TENANT,
        property_id: TENANT_PROPERTY,
        unit_id: TENANT_UNIT,
        guest_name: "Správa Testová",
        guest_email: email,
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
  const { id, access_token: token } = created as { id: string; access_token: string };
  try {
    await db.from("messages").insert({
      tenant_id: TENANT,
      reservation_id: id,
      sender: "staff",
      body: `E2E: vitajte ${stamp}`,
    });

    await page.goto(`${GUEST_URL}/ucet`);
    await page.waitForURL(/\/ucet\/prihlasenie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslať kód" }).click();
    const firstDigit = page.getByLabel(/^Číslica 1 z/);
    await expect(firstDigit).toBeVisible();
    const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await firstDigit.fill(link.properties!.email_otp);
    await page.getByRole("button", { name: "Prihlásiť sa" }).click();
    await page.waitForURL(/\/ucet$/);

    // Unread: point on the stay card and the badge.
    const card = page.getByRole("link", { name: /Otvoriť pobyt/ });
    await expect(card).toContainText("Nová správa od");
    await expect(
      page.getByRole("navigation", { name: "Môj účet" }).getByLabel(/na vybavenie/),
    ).toBeVisible();
    await card.click();
    await page.waitForURL(new RegExp(`/ucet/pobyt/${id}`));
    await expect(page.getByRole("link", { name: /^Nová správa od/ })).toBeVisible();

    const section = page.locator("#spravy");
    if (mobile) {
      await section.getByRole("link", { name: /Napíšte správu|E2E: vitajte/ }).click();
      await page.waitForURL(new RegExp(`/ucet/pobyt/${id}/spravy`));
    }
    const log = page.getByRole("log");
    await expect(log.getByText(`E2E: vitajte ${stamp}`)).toBeVisible();
    await expect(log.getByText(/nová správa/)).toBeVisible();
    await page.getByRole("textbox", { name: /Správa pre/ }).fill(`E2E otázka ${stamp}`);
    await page.getByRole("button", { name: "Odoslať" }).click();
    await expect(log.getByText(`E2E otázka ${stamp}`)).toBeVisible();
    await expect(log.getByText(/odoslané/)).toBeVisible();
    await noSeriousA11y(page, mobile ? undefined : "#spravy");

    // The owner gets it: the message and a notification; the guest's read state is stored.
    const { data: rows } = await db
      .from("messages")
      .select("sender, body")
      .eq("reservation_id", id)
      .order("created_at");
    expect(rows?.map((r) => r.sender)).toEqual(["staff", "guest"]);
    await expect
      .poll(async () => {
        const { count } = await db
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", TENANT)
          .eq("kind", "message_new")
          .filter("data->>number", "neq", "")
          .gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
        return count ?? 0;
      })
      .toBeGreaterThan(0);
    const { data: thread } = await db
      .from("message_threads")
      .select("guest_read_at")
      .eq("reservation_id", id)
      .single();
    expect(thread?.guest_read_at).not.toBeNull();

    // The e-mail "Odpovedať" opens the conversation through the access link — no password.
    await page.context().clearCookies();
    await page.goto(`${GUEST_URL}/r/${token}/spravy`);
    await expect(page.getByRole("log").getByText(`E2E otázka ${stamp}`)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Správa pre/ })).toBeVisible();
  } finally {
    await db.from("reservations").delete().eq("id", id);
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
