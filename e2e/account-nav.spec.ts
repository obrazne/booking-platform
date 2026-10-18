import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { service, TENANT, TEST_DOMAIN } from "./helpers";

// Navigation of the guest account (Z59, linka B): after signing in the current stay opens under "Aktuálny pobyt",
// "Ďalší pobyt ›" leads to the next one, a past stay has "← Všetky pobyty" with Pobyty lit, and "Môj účet" in the
// header has the same items. Ukážkový klient only (never STRÖMY), e-mails "+b". PC and phone (390 px).

const PROPERTY = "b0000000-0000-4000-8000-000000000006"; // Glamping Lúka
const UNITS = [
  "c0000000-0000-4000-8000-000000000060",
  "c0000000-0000-4000-8000-000000000061",
  "c0000000-0000-4000-8000-000000000062",
];
const UKAZKA_URL = GUEST_URL.replace("://stromy.", "://ukazka.");
const db = service();
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** A confirmed stay of the guest on any free glamping unit, the first free of the offsets (days from today). */
async function stay(email: string, offsets: number[]): Promise<{ id: string; checkIn: string }> {
  for (const offset of offsets)
    for (const unit of UNITS) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      const checkIn = iso(d);
      d.setUTCDate(d.getUTCDate() + 2);
      const { data, error } = await db
        .rpc("create_reservation", {
          p: {
            tenant_id: TENANT,
            property_id: PROPERTY,
            unit_id: unit,
            guest_name: "Navigácia Testová",
            guest_email: email,
            adults: 2,
            currency: "EUR",
            total_cents: 30000,
            status: "confirmed",
            lines: [
              {
                kind: "accommodation",
                label: "Ubytovanie",
                quantity: 2,
                unit_amount_cents: 15000,
                amount_cents: 30000,
              },
            ],
            check_in: checkIn,
            check_out: iso(d),
          },
        })
        .single();
      if (!error) return { id: (data as { id: string }).id, checkIn };
      if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`)) throw error;
    }
  throw new Error("No free stay found");
}

async function serious(page: Page) {
  const r = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

test("account navigation: current stay first, next stay, back to all stays, Môj účet menu", async ({
  page,
}, info) => {
  test.slow();
  const email = `e2e-nav-${Date.now().toString(36)}-${info.project.name}+b@${TEST_DOMAIN}`;
  const ids: string[] = [];
  try {
    const later = Array.from({ length: 20 }, () => 200 + Math.floor(Math.random() * 100));
    const sooner = Array.from({ length: 20 }, () => 60 + Math.floor(Math.random() * 100));
    const past = await stay(email, [-40, -50, -60, -70, -80]);
    const current = await stay(email, sooner);
    const next = await stay(email, later);
    ids.push(past.id, current.id, next.id);
    await db.from("reservations").update({ status: "completed" }).eq("id", past.id);

    await page.goto(`${UKAZKA_URL}/ucet`);
    await page.waitForURL(/\/ucet\/prihlasenie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslať kód" }).click();
    const firstDigit = page.getByLabel(/^Číslica 1 z/);
    await expect(firstDigit).toBeVisible();
    const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await firstDigit.fill(link.properties!.email_otp);
    await page.getByRole("button", { name: "Prihlásiť sa" }).click();

    // Signing in opens the current stay (the nearest coming one).
    await page.waitForURL(new RegExp(`/ucet/pobyt/${current.id}$`));
    const tabs = page.getByRole("navigation", { name: "Môj účet" });
    await expect(tabs.getByRole("link", { name: "Aktuálny pobyt" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("main").getByRole("link", { name: "Všetky pobyty" })).toHaveCount(
      0,
    );
    expect(await serious(page)).toEqual([]);

    // "Ďalší pobyt ›" → the next stay: Pobyty lit, "← Všetky pobyty".
    await page.getByRole("link", { name: /^Ďalší pobyt:/ }).click();
    await page.waitForURL(new RegExp(`/ucet/pobyt/${next.id}$`));
    await expect(tabs.getByRole("link", { name: /^Pobyty/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // A past stay: "← Všetky pobyty" above the heading, back to the list.
    await page.goto(`${UKAZKA_URL}/ucet/pobyt/${past.id}`);
    await expect(tabs.getByRole("link", { name: /^Pobyty/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const back = page.getByRole("main").getByRole("link", { name: "Všetky pobyty" });
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForURL(/\/ucet$/);

    // "Môj účet" in the header: the same items as the tabs and "Odhlásiť sa".
    await page.getByRole("button", { name: "Môj účet — menu" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Aktuálny pobyt",
      /^Pobyty/,
      "Moje údaje",
      "Odhlásiť sa",
    ]);
    await menu.getByRole("menuitem", { name: "Moje údaje" }).click();
    await page.waitForURL(/\/ucet\/udaje$/);
    await expect(tabs.getByRole("link", { name: "Moje údaje" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } finally {
    if (ids.length) {
      await db.from("email_outbox").delete().in("reservation_id", ids);
      await db.from("reservations").delete().in("id", ids);
      await db.from("record_history").delete().eq("tenant_id", TENANT).in("record_id", ids);
    }
  }
});
