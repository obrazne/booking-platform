import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT_PROPERTY, loginOwner, service } from "./helpers";

test("owner edits page sections: switch, order by keyboard, form from the schema", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "admin on desktop");
  const db = service();
  const { data: before } = await db
    .from("property_sections")
    .select("id, type, sort, enabled, content")
    .eq("property_id", TENANT_PROPERTY);
  try {
    page.on("dialog", (d) => d.accept());
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}/page`);
    await expect(page.getByRole("heading", { name: "Sekcie stránky objektu" })).toBeVisible();

    // The calendar cannot be switched off; FAQ can.
    await expect(
      page.getByRole("switch", { name: "Zobraziť sekciu Kalendár s cenami" }),
    ).toHaveCount(0);
    const faqSwitch = page.getByRole("switch", { name: "Zobraziť sekciu Časté otázky" });
    await faqSwitch.click();
    await expect(faqSwitch).toHaveAttribute("aria-checked", "false");

    // Order with the keyboard (Alt + arrow on the row).
    const rows = page
      .getByRole("list", { name: "Sekcie v poradí na stránke" })
      .getByRole("listitem");
    const faqRow = rows.filter({ hasText: "Časté otázky" });
    const index = async () =>
      (await rows.allInnerTexts()).findIndex((t) => t.includes("Časté otázky"));
    const start = await index();
    await faqRow.focus();
    await page.keyboard.press("Alt+ArrowUp");
    await expect.poll(index).toBe(start - 1);

    // Form generated from the schema: add a question and save.
    await page.getByRole("link", { name: "Upraviť sekciu Časté otázky" }).click();
    const panel = page.getByRole("dialog");
    await panel.getByRole("button", { name: "Pridať položku" }).click();
    await panel.getByLabel("Otázka").fill("E2E otázka?");
    await panel.getByLabel("Odpoveď").fill("E2E odpoveď.");
    await panel.getByRole("button", { name: "Uložiť sekciu" }).click();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("property_sections")
          .select("content")
          .eq("property_id", TENANT_PROPERTY)
          .eq("type", "faq")
          .single();
        return JSON.stringify(data?.content);
      })
      .toContain("E2E otázka?");
  } finally {
    // Put the page of the demo property back exactly as it was.
    for (const s of before ?? []) {
      await db
        .from("property_sections")
        .update({ sort: s.sort, enabled: s.enabled, content: s.content })
        .eq("id", s.id);
    }
  }
});
