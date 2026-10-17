import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { service, TEST_DOMAIN } from "./helpers";

// Online check-in for guests (Z39, linka B): through the access link the guest fills in two persons (one foreigner),
// the validations hold, completing unlocks the arrival instructions (property setting) and the data can be changed
// before arrival without retyping the document. Ukážkový klient only (never STRÖMY), e-mails "+b" on the test domain.

const UKAZKA = "a0000000-0000-4000-8000-000000000001";
const PROPERTY = "b0000000-0000-4000-8000-000000000006"; // Glamping Lúka
const UNITS = [
  "c0000000-0000-4000-8000-000000000062",
  "c0000000-0000-4000-8000-000000000061",
  "c0000000-0000-4000-8000-000000000060",
];
const UKAZKA_URL = GUEST_URL.replace("://stromy.", "://ukazka.");
const db = service();

type Setup = { id: string; token: string; restore: () => Promise<void> };

async function setup(tag: string): Promise<Setup> {
  const { data: before } = await db
    .from("properties")
    .select("checkin_required_for_instructions")
    .eq("id", PROPERTY)
    .single();
  const { data: hadPrivate } = await db
    .from("property_private")
    .select("property_id")
    .eq("property_id", PROPERTY)
    .maybeSingle();
  await db
    .from("properties")
    .update({ checkin_required_for_instructions: true })
    .eq("id", PROPERTY);
  if (!hadPrivate)
    await db.from("property_private").insert({
      tenant_id: UKAZKA,
      property_id: PROPERTY,
      arrival_instructions: { sk: "E2E pokyny: kľúč je v schránke, kód 0000." },
    });
  const restore = async () => {
    await db
      .from("properties")
      .update({
        checkin_required_for_instructions: before?.checkin_required_for_instructions ?? false,
      })
      .eq("id", PROPERTY);
    if (!hadPrivate) await db.from("property_private").delete().eq("property_id", PROPERTY);
  };
  // Arrival in 1–3 days: the check-in is open and the instructions may unlock (3 days before arrival).
  const today = new Date();
  for (const unit of UNITS)
    for (const offset of [2, 1, 3]) {
      const d = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset),
      );
      const checkIn = d.toISOString().slice(0, 10);
      d.setUTCDate(d.getUTCDate() + 2);
      const checkOut = d.toISOString().slice(0, 10);
      const { data, error } = await db
        .rpc("create_reservation", {
          p: {
            tenant_id: UKAZKA,
            property_id: PROPERTY,
            unit_id: unit,
            guest_name: "Eva Testová",
            guest_email: `e2e-checkin-${tag}+b@${TEST_DOMAIN}`,
            adults: 2,
            currency: "EUR",
            total_cents: 30000,
            status: "confirmed",
            lines: [
              {
                kind: "accommodation",
                label: "Pobyt",
                quantity: 1,
                unit_amount_cents: 30000,
                amount_cents: 30000,
              },
            ],
            check_in: checkIn,
            check_out: checkOut,
          },
        })
        .single();
      if (!error) {
        const r = data as { id: string; access_token: string };
        return { id: r.id, token: r.access_token, restore };
      }
      if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`)) {
        await restore();
        throw error;
      }
    }
  await restore();
  throw new Error("No free stay found");
}

async function cleanup(s: Setup | null) {
  if (!s) return;
  await db.from("email_outbox").delete().eq("reservation_id", s.id);
  await db.from("notifications").delete().eq("tenant_id", UKAZKA).like("dedupe_key", `%${s.id}%`);
  await db.from("reservations").delete().eq("id", s.id);
  await db.from("record_history").delete().eq("tenant_id", UKAZKA).eq("record_id", s.id);
  await s.restore();
}

test("guest completes the online check-in for two persons and unlocks the instructions", async ({
  page,
}, info) => {
  let s: Setup | null = null;
  try {
    s = await setup(`${Date.now().toString(36)}-${info.project.name}`);
    const visible = async () =>
      (await db.rpc("arrival_instructions_visible", { p_reservation_id: s!.id })).data;
    expect(await visible()).toBe(false);

    await page.goto(`${UKAZKA_URL}/r/${s.token}`);
    await expect(page.getByRole("heading", { name: /Vybavte to teraz/ })).toBeVisible();
    await page.getByRole("link", { name: /Začať check-in/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Kto prichádza/ })).toBeVisible();

    // Without the consent the button is off and says why.
    const finish = page.getByRole("button", { name: "Dokončiť check-in" });
    await expect(finish).toBeDisabled();
    await expect(page.getByText("Najprv potvrďte ubytovací poriadok.")).toBeVisible();
    await page.getByRole("checkbox").check();
    // Missing fields: the person opens with the fields highlighted.
    await finish.click();
    await expect(page.getByText("Doplňte, prosím, chýbajúce údaje hostí.")).toBeVisible();

    // 1. Eva (prefilled from the reservation), Slovak citizen.
    await expect(page.getByLabel("Meno")).toHaveValue("Eva");
    await page.getByLabel("Číslo dokladu").fill("EA 123456");
    await page.getByLabel("Adresa trvalého pobytu").fill("Hlavná 1, 058 01 Poprad");
    // 2. John Smith from the United Kingdom.
    await page.getByRole("button", { name: /2\. hosť/ }).click();
    await page.getByLabel("Meno").fill("John");
    await page.getByLabel("Priezvisko").fill("Smith");
    await page.getByRole("button", { name: "Iná krajina" }).click();
    await page.getByLabel("Krajina").selectOption("GB");
    await page.getByLabel("Dátum narodenia").fill("1980-05-01");
    await page.getByRole("combobox", { name: "Doklad", exact: true }).selectOption("passport");
    await page.getByLabel("Číslo dokladu").fill("123456789");
    await page.getByLabel("Adresa trvalého pobytu").fill("1 High St, London, UK");
    await page.getByRole("button", { name: "16:00" }).click();

    const axe = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

    await finish.click();
    await expect(page.getByRole("heading", { level: 1, name: /Hotovo/ })).toBeVisible();
    const { data: checkin } = await db
      .from("checkins")
      .select("status, arrival_time")
      .eq("reservation_id", s.id)
      .single();
    expect(checkin).toEqual({ status: "completed", arrival_time: "16:00" });
    const { data: persons } = await db
      .from("checkin_guests")
      .select("last_name, is_citizen, nationality, document_number, birth_date")
      .eq("reservation_id", s.id)
      .order("sort");
    expect(persons).toEqual([
      {
        last_name: "Testová",
        is_citizen: true,
        nationality: "SK",
        document_number: "EA123456",
        birth_date: null,
      },
      {
        last_name: "Smith",
        is_citizen: false,
        nationality: "GB",
        document_number: "123456789",
        birth_date: "1980-05-01",
      },
    ]);
    expect(await visible()).toBe(true);

    // Change before arrival: the document stays saved (shown masked), the check-in is completed again.
    await page.getByRole("link", { name: "Upraviť údaje" }).click();
    await page.getByRole("button", { name: /2\. John Smith/ }).click();
    await expect(page.getByText("Uložené (••••89)")).toBeVisible();
    await page.getByLabel("Adresa trvalého pobytu").fill("2 High St, London, UK");
    await finish.click();
    await expect(page.getByRole("heading", { level: 1, name: /Hotovo/ })).toBeVisible();
    const { data: john } = await db
      .from("checkin_guests")
      .select("address, document_number")
      .eq("reservation_id", s.id)
      .eq("last_name", "Smith")
      .single();
    expect(john).toEqual({ address: "2 High St, London, UK", document_number: "123456789" });

    // Back on the stay: the card says done.
    await page.getByRole("link", { name: "Späť na pobyt" }).first().click();
    await expect(page.getByText("Check-in hotový")).toBeVisible();
  } finally {
    await cleanup(s);
  }
});
