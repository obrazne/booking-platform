import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import {
  TENANT,
  TENANT_PROPERTY,
  TENANT_UNIT,
  TEST_DOMAIN,
  freeStay,
  loginOwner,
  service,
} from "./helpers";

// Podklad na doklad (Z51): the owner copies the basis and downloads its PDF, uploads the issued document, the guest
// sees it under "Doklady"; the monthly CSV lists the stay with "doklad nahratý". Demo client only.

test("basis: copy, PDF, upload the issued document → the guest sees it; monthly CSV", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const stamp = Date.now().toString(36);
  const stay = await freeStay(2);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: TENANT,
        property_id: TENANT_PROPERTY,
        unit_id: TENANT_UNIT,
        guest_name: `Doklad Testový ${stamp}`,
        guest_email: `e2e-invoice-${stamp}@${TEST_DOMAIN}`,
        adults: 2,
        currency: "EUR",
        total_cents: 25000,
        status: "confirmed",
        lines: [
          {
            kind: "accommodation",
            label: "Ubytovanie",
            quantity: 2,
            unit_amount_cents: 11000,
            amount_cents: 22000,
          },
          {
            kind: "fee",
            label: "Upratovanie",
            quantity: 1,
            unit_amount_cents: 3000,
            amount_cents: 3000,
          },
        ],
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      },
    })
    .single();
  if (error) throw error;
  const {
    id,
    number,
    access_token: token,
  } = created as {
    id: string;
    number: string;
    access_token: string;
  };
  const paths: string[] = [];
  try {
    await db.from("payments").insert({
      tenant_id: TENANT,
      reservation_id: id,
      provider: "bank_transfer",
      amount_cents: 25000,
      currency: "EUR",
      variable_symbol: number.replace("-", ""),
      status: "received",
      received_at: new Date().toISOString(),
    });

    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ADMIN_URL });
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/reservations?panel=reservation:${id}`);
    const panel = page.getByRole("dialog");
    const basis = panel.locator("section").filter({ hasText: "Podklad na doklad" }).first();
    await expect(basis).toContainText("doklad chýba");
    await expect(basis).toContainText("250,00");

    // Kopírovať: the text for the invoicing tool.
    await basis.getByRole("button", { name: "Kopírovať" }).click();
    await expect(page.getByText("Podklad skopírovaný.")).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain(`Podklad na doklad ${number}`);
    expect(text).toContain("Ubytovanie — 2 × 110,00");
    expect(text).toContain(`VS ${number.replace("-", "")}`);

    // Stiahnuť PDF: a PDF of the basis.
    const href = await basis.getByRole("link", { name: "Stiahnuť PDF" }).getAttribute("href");
    const pdf = await page.request.get(`${ADMIN_URL}${href}`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .include("[role=dialog]")
      .analyze();
    expect(
      axe.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
    ).toEqual([]);

    // Upload the issued document (kind "Doklad (faktúra)").
    await panel.getByRole("button", { name: "Nahrať dokument" }).click();
    await panel.getByLabel("Názov").fill(`Faktúra ${stamp}`);
    await panel.getByLabel("Druh").selectOption("invoice");
    await expect(panel.getByText("Doklad hosť uvidí")).toBeVisible();
    await panel.getByLabel("Súbor").setInputFiles({
      name: "faktura.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
    });
    await expect(page.getByText("Dokument nahraný.")).toBeVisible();
    await expect(basis).toContainText("doklad nahratý");
    const { data: docs } = await db
      .from("documents")
      .select("kind, visible_when, storage_path")
      .eq("reservation_id", id);
    paths.push(...(docs ?? []).map((d) => d.storage_path));
    expect(docs?.map((d) => [d.kind, d.visible_when])).toEqual([["invoice", "always"]]);

    // The monthly CSV (by departure) lists the stay with the uploaded document.
    const csv = await page.request.get(
      `${ADMIN_URL}/admin/reservations/podklady?mesiac=${stay.checkOut.slice(0, 7)}`,
    );
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const body = await csv.text();
    const row = body.split("\r\n").find((l) => l.startsWith(number));
    expect(row).toContain("250,00");
    expect(row).toContain("doklad nahratý");

    // The guest (access link) sees it under "Doklady".
    await page.goto(`${GUEST_URL}/r/${token}`);
    const section = page.locator("#doklady");
    await expect(section.getByRole("heading", { name: "Doklady" })).toBeVisible();
    await expect(section.getByRole("link", { name: `Faktúra ${stamp}` })).toBeVisible();
  } finally {
    if (paths.length) await db.storage.from("guest-documents").remove(paths);
    await db.from("documents").delete().eq("reservation_id", id);
    await db.from("reservations").delete().eq("id", id);
  }
});
