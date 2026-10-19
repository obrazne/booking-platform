import { createHash, randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Hostia (Z68, linka B) on the Ukážkový klient: the list with filters, a guest added by hand, the card (contact,
// note), the request for the consent confirmed by the guest's click on the link, the revocation in the guest's name,
// the export into the history of changes. A temporary test guest (+b@booking-platform.test), removed at the end.

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

test("guests: list, manual guest, card, consent request and revocation, export", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const db = service();
  const stamp = Date.now().toString(36);
  const email = `e2e-host-${stamp}+b@booking-platform.test`;
  const started = new Date().toISOString();
  try {
    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/guests`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hostia");
    await expect(page.getByRole("group", { name: "Filter hostí" })).toBeVisible();
    await axe(page);

    // + Pridať hosťa (without a consent).
    await page.getByRole("button", { name: "Pridať hosťa" }).click();
    const dialog = page.getByRole("dialog", { name: "Nový hosť" });
    await dialog.getByLabel("E-mail").fill(email);
    await dialog.getByLabel("Meno").fill(`E2E Hosť ${stamp}`);
    await dialog.getByRole("button", { name: "Pridať hosťa" }).click();
    await expect(dialog).toHaveCount(0);
    const { data: guest } = await db
      .from("guests")
      .select("id, source, marketing_consent")
      .eq("email", email)
      .single();
    expect(guest).toMatchObject({ source: "manual", marketing_consent: false });

    // Search, the card.
    await page.getByPlaceholder("Hľadať hosťa — meno, e-mail, telefón").fill(stamp);
    await page.getByRole("row", { name: new RegExp(`E2E Hosť ${stamp}`) }).click();
    const card = page.getByRole("dialog", { name: `E2E Hosť ${stamp}` });
    await expect(card).toContainText("Pridaný ručne");
    await expect(card).toContainText("Bez súhlasu s ponukami");

    if (!mobile) {
      // Contact: the address with who filled it in.
      await card.getByRole("button", { name: "Upraviť" }).click();
      await card.getByLabel("Adresa").fill("Hlavná 1, 811 01 Bratislava");
      await card.getByRole("button", { name: "Uložiť", exact: true }).click();
      await expect(card).toContainText("doplnil tím", { timeout: 15000 });
      // The team's note.
      await card.getByLabel("Poznámka (vidíte len vy a váš tím)").fill("Chodia s deťmi");
      await card.getByRole("button", { name: "Uložiť poznámku" }).click();
      await expect
        .poll(
          async () =>
            (await db.from("guest_notes").select("body").eq("guest_id", guest!.id).maybeSingle())
              .data?.body,
        )
        .toBe("Chodia s deťmi");
    }

    // The request for the consent; the guest confirms with a click on the link.
    await card.getByRole("button", { name: "Poslať žiadosť o súhlas" }).click();
    await expect(card.getByRole("status")).toContainText(`Žiadosť odoslaná na ${email}`);
    const token = randomBytes(24).toString("hex");
    await db
      .from("guest_consent_requests")
      .update({ token_hash: createHash("sha256").update(token).digest("hex") })
      .eq("guest_id", guest!.id);
    const guestPage = await page.context().newPage();
    await guestPage.goto(`${GUEST_URL}/suhlas/${token}`);
    await expect(guestPage.getByRole("heading", { level: 1 })).toContainText("Ponuky od");
    await guestPage.getByRole("button", { name: "Áno, chcem dostávať ponuky" }).click();
    await expect(guestPage.getByRole("status")).toContainText("súhlas sme zapísali");
    await guestPage.close();
    const { data: after } = await db
      .from("guest_consent_events")
      .select("granted, source")
      .eq("guest_id", guest!.id);
    expect(after).toEqual([{ granted: true, source: "owner_request" }]);

    // Revocation in the guest's name, with the reason.
    await page.reload();
    await expect(card).toContainText("Súhlas s ponukami od");
    await card.getByRole("button", { name: "Odvolať súhlas v mene hosťa" }).click();
    await card.getByLabel("Dôvod").fill("Hosť ma požiadal o odhlásenie");
    await card.getByRole("button", { name: "Odvolať súhlas" }).click();
    await expect(card).toContainText("Bez súhlasu s ponukami");
    await expect(card).toContainText("Hosť súhlas odvolal");

    if (!mobile) {
      // Export with the consent → a CSV and a row in the history of changes.
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Export" }).click();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: /Len so súhlasom s ponukami/ }).click(),
      ]);
      expect(download.suggestedFilename()).toBe("hostia-so-suhlasom.csv");
      const { count } = await db
        .from("record_history")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", TENANT)
        .eq("table_name", "guest_export")
        .gte("changed_at", started);
      expect(count).toBeGreaterThan(0);
    }
  } finally {
    const { data: g } = await db.from("guests").select("id").eq("email", email).maybeSingle();
    if (g) {
      const { data: reqs } = await db
        .from("guest_consent_requests")
        .select("id")
        .eq("guest_id", g.id);
      for (const r of reqs ?? [])
        await db.from("email_outbox").delete().eq("payload->>request_id", r.id);
      await db.from("guests").delete().eq("id", g.id);
    }
    await db
      .from("record_history")
      .delete()
      .eq("tenant_id", TENANT)
      .eq("table_name", "guest_export")
      .gte("changed_at", started);
  }
});
