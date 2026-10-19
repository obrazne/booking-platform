import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, loginPlatformAdmin, markToursSeen, service, TENANT } from "./helpers";

// Hľadanie (Ctrl K) a Pomoc (Z67, linka B) on the Ukážkový klient: the register finds a setting and opens it with the
// field ringed; questions of Pomoc; reservations from the database; Pomoc with "Pomohlo vám to?" and
// "Nenašli ste odpoveď?" (the request reaches the control center); the phone opens the search with the magnifier.

async function axe(page: Page) {
  const a11y = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);
}

test("search: Ctrl K, settings with the field, help, reservations, Esc", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "the phone has its own test");
  const db = service();
  const { data: res } = await db
    .from("reservations")
    .select("id, number")
    .eq("tenant_id", TENANT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin`);
  const box = page.getByRole("combobox", { name: "Hľadať v administrácii" });
  await page.keyboard.press("Control+k");
  await expect(box).toBeFocused();
  // Empty field: examples.
  await expect(page.getByText("Skúste napríklad")).toBeVisible();

  await box.fill("iban");
  const list = page.getByRole("listbox", { name: "Výsledky hľadania" });
  await expect(
    list.getByRole("group", { name: "Nastavenia a stránky" }).getByRole("option").first(),
  ).toContainText("Bankový účet (IBAN)");
  await expect(list.getByRole("group", { name: "Pomoc" })).toContainText(
    "Kde zmením bankový účet (IBAN) pre platby?",
  );
  await box.press("Enter");
  await page.waitForURL(/\/admin\/settings\?hl=iban/);
  await expect(page.locator("#iban")).toBeFocused();
  await expect(page.locator(".search-hl")).toHaveCount(1);

  // A question of Pomoc opens in Pomoc.
  await box.fill("upratov");
  await list
    .getByRole("group", { name: "Pomoc" })
    .getByRole("option", { name: /deň voľna na upratovanie/ })
    .click();
  await page.waitForURL(/\/admin\/help\?open=cleaningGap/);
  await expect(page.getByRole("button", { name: /deň voľna na upratovanie/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  if (res) {
    await box.fill(res.number);
    const hit = list
      .getByRole("group", { name: "Rezervácie a hostia" })
      .getByRole("option")
      .first();
    await expect(hit).toContainText(res.number);
    await box.press("Enter");
    await page.waitForURL(new RegExp(`panel=reservation:${res.id}`));
  }

  await box.fill("storno");
  await expect(list).toBeVisible();
  await box.press("Escape");
  await expect(list).toHaveCount(0);
});

test("Pomoc: topics, steps, feedback, request reaches the control center", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const db = service();
  const stamp = Date.now().toString(36);
  const message = `E2E žiadosť o pomoc ${stamp}`;
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const qa = users.users.find((u) => u.email === "qa@booking-platform.test");
  try {
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/help?from=/admin/blocks`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("S čím vám pomôžeme?");
    await axe(page);

    await page.getByRole("button", { name: /^Platby/ }).click();
    await expect(page.getByRole("button", { name: /Ako zablokujem termín/ })).toHaveCount(0);
    await page.getByRole("button", { name: /^Všetko/ }).click();
    const q = page.getByRole("button", { name: "Ako zablokujem termín, keď idem upratovať?" });
    await q.click();
    await expect(q).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Otvoriť Blokácie" })).toHaveAttribute(
      "href",
      "/admin/blocks",
    );
    await page.getByRole("button", { name: "Áno", exact: true }).click();
    await expect(page.getByText("Ďakujeme, zapísali sme si to.")).toBeVisible();

    // "Nenašli ste odpoveď?" with the client, the person and the page they came from.
    const form = page.getByRole("complementary", { name: "Nenašli ste odpoveď?" });
    await expect(form).toContainText("stránka /admin/blocks");
    await form.getByLabel("S čím potrebujete pomôcť?").fill(message);
    await form.getByRole("button", { name: "Odoslať" }).click();
    await expect(form.getByRole("status")).toContainText("Odoslané.");
    const { data: request } = await db
      .from("support_requests")
      .select("id, page, tenant_id")
      .eq("message", message)
      .single();
    expect(request).toMatchObject({ page: "/admin/blocks", tenant_id: TENANT });

    if (!mobile) {
      await page.context().clearCookies();
      await loginPlatformAdmin(page, ADMIN_URL);
      await page.goto(`${ADMIN_URL}/platform/support`);
      const row = page.getByRole("listitem").filter({ hasText: message });
      await row.locator("summary").click();
      await expect(row).toContainText("/admin/blocks");
      await row.getByRole("button", { name: "Vybavené" }).click();
      await expect(row).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Hodnotenie návodov" })).toBeVisible();
      await axe(page);
    }
  } finally {
    const { data: rows } = await db.from("support_requests").select("id").eq("message", message);
    for (const r of rows ?? []) {
      await db.from("notifications").delete().eq("dedupe_key", `support_request:${r.id}`);
      await db
        .from("email_outbox")
        .delete()
        .eq("kind", "platform_support_request")
        .eq("payload->>request_id", r.id);
      await db.from("support_requests").delete().eq("id", r.id);
    }
    if (qa) await db.from("help_feedback").delete().eq("user_id", qa.id);
  }
});

test("phone: the magnifier opens the search", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "phone only");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin`);
  await page.getByRole("button", { name: "Hľadať", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Hľadať v administrácii" });
  const box = dialog.getByRole("combobox");
  await expect(box).toBeFocused();
  await box.fill("kód od dverí");
  await expect(dialog.getByRole("option", { name: /Kód od dverí/ }).first()).toBeVisible();
  await dialog.getByRole("button", { name: "Zavrieť hľadanie" }).click();
  await expect(dialog).toHaveCount(0);
});
