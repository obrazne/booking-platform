import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import {
  freeStay,
  loginAs,
  loginOwner,
  loginPlatformAdmin,
  markToursSeen,
  service,
  STROMY,
  STROMY_UNIT,
  TEST_DOMAIN,
} from "./helpers";

// Administration and logins by the approved visual v1 (Z23): computer and 390 px, accessibility (axe).
test.describe.configure({ mode: "serial" });

async function serious(page: Page, label: string, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const result = await builder.analyze();
  const lines = result.violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target.join(" ")}`,
  );
  console.log(`[a11y] ${label}: ${lines.length ? "\n  " + lines.join("\n  ") : "bez nálezov"}`);
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => v.id);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("01 login: split screen, sign-in link never reveals whether the account exists", async ({
  page,
}) => {
  await page.goto(`${ADMIN_URL}/login`);
  await expect(page.getByRole("heading", { name: "Vitajte späť." })).toBeVisible();
  await page.getByLabel("E-mail").fill(`nikto-${Date.now()}@${TEST_DOMAIN}`);
  await page.getByRole("button", { name: "Poslať prihlasovací odkaz na e-mail" }).click();
  await expect(page.getByRole("status")).toContainText("Ak k tomuto e-mailu existuje účet");
  expect.soft(await serious(page, "prihlásenie")).toEqual([]);
  await noHorizontalScroll(page);
});

test("02 overview, 03 reservations with the panel, 04 calendar", async ({ page }, info) => {
  const mobile = info.project.name === "mobile";
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);

  // 02 Overview: greeting, four numbers, upcoming stays, occupancy.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dobr(é|ý)/);
  await expect(page.getByText("Ušetrené na províziách")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Najbližšie pobyty" })).toBeVisible();
  expect.soft(await serious(page, "prehľad")).toEqual([]);
  await noHorizontalScroll(page);

  // 03 Reservations: open a row, switch to another one, close by Esc / click beside.
  await page.goto(`${ADMIN_URL}/admin/reservations`);
  const rows = page.locator('[role="table"] a[role="row"]');
  await expect(rows.nth(1)).toBeVisible();
  const firstNumber = (await rows.nth(0).locator('[role="cell"]').first().textContent())!.trim();
  const secondNumber = (await rows.nth(1).locator('[role="cell"]').first().textContent())!.trim();
  // Z26: the panel opens right after the click (shell first), the detail follows; the list is not reloaded.
  const before = await rows.count();
  const clicked = Date.now();
  await rows.nth(0).click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  expect(Date.now() - clicked).toBeLessThan(1500);
  await expect(panel).toContainText(firstNumber);
  expect(await rows.count()).toBe(before);
  await page.waitForTimeout(400); // slide-in animation (fading text would count as low contrast)
  expect.soft(await serious(page, "panel rezervácie", "[role=dialog]")).toEqual([]);
  if (!mobile) {
    // The list stays usable: another row switches the record, the panel stays open.
    // Left part of the row — the right part is under the panel.
    await rows.nth(1).click({ position: { x: 40, y: 20 } });
    await expect(panel).toContainText(secondNumber);
    await expect(rows.nth(1)).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await rows.nth(0).click();
    await expect(panel).toBeVisible();
    await page.getByRole("heading", { level: 1, name: "Rezervácie" }).click();
    await expect(panel).toBeHidden();
  } else {
    // Phone (07): full screen with "‹ Rezervácie".
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(390);
    await panel.getByRole("button", { name: "Rezervácie" }).click();
    await expect(panel).toBeHidden();
  }
  await page.getByRole("button", { name: /^Zaplatené/ }).click();
  await expect(page).toHaveURL(/status=confirmed/);

  // 04 Calendar: pick arrival and departure in free days → "Nový termín" with the price.
  const stay = await freeStay(3);
  await page.goto(`${ADMIN_URL}/admin/calendar?month=${stay.checkIn.slice(0, 7)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Kalendár" })).toBeVisible();
  const day = (d: string) => page.locator(`button[data-cal-day="${d}"]`).filter({ visible: true });
  await day(stay.checkIn).click();
  await expect(page.getByText(/teraz kliknite na deň odchodu/)).toBeVisible();
  // Keyboard: the departure is reached with the arrow keys and Enter.
  await day(stay.checkIn).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  if ((await day(stay.checkOut).count()) > 0) await page.keyboard.press("Enter");
  else await page.locator(`button[data-cal-day="${stay.checkOut}"]`).first().click();
  const newStay = page.getByRole("dialog");
  await expect(newStay).toContainText("Nový termín");
  await expect(newStay).toContainText("Cena podľa cenníka");
  await page.waitForTimeout(400);
  await expect(newStay.getByRole("link", { name: "Vytvoriť ručnú rezerváciu" })).toHaveAttribute(
    "href",
    new RegExp(`check_in=${stay.checkIn}&check_out=${stay.checkOut}`),
  );
  expect.soft(await serious(page, "kalendár")).toEqual([]);
  await noHorizontalScroll(page);
});

test("05 control center: own menu, clients, client panel without guest data", async ({
  page,
}, info) => {
  await loginPlatformAdmin(page, ADMIN_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Klienti" })).toBeVisible();
  if (info.project.name !== "mobile") {
    // Own menu: no accommodation picker.
    await expect(page.locator("aside")).not.toContainText("Ubytovanie");
  }
  await page
    .locator(`a[href*="panel=tenant%3A${STROMY}"], a[href*="panel=tenant:${STROMY}"]`)
    .click();
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText("Chalet STRÖMY");
  await expect(panel).toContainText("Balík a moduly");
  await expect(page.getByText("Riadiace centrum nevidí mená ani kontakty hostí")).toBeVisible();
  expect.soft(await serious(page, "riadiace centrum")).toEqual([]);
  await noHorizontalScroll(page);
});

test("08 guest login: client theme, code boxes after the e-mail", async ({ page }) => {
  await page.goto(`${GUEST_URL}/ucet/prihlasenie`);
  await expect(page.getByRole("heading", { name: "Vaše pobyty na jednom mieste." })).toBeVisible();
  expect.soft(await serious(page, "prihlásenie hosťa")).toEqual([]);
  await noHorizontalScroll(page);
});

test("v1.1 panel: one column, long name, e-mail and note never overlap", async ({ page }, info) => {
  const db = service();
  const stay = await freeStay(2);
  const long = "Maximiliána Alexandrovna Kowalczyk-Hohenzollernová-Szentgyörgyiová";
  const email = `veľmi.dlhá.adresa.pre.test.prekrývania.${Date.now()}@${TEST_DOMAIN}`;
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: STROMY,
        property_id: "b0000000-0000-4000-8000-000000000100",
        unit_id: STROMY_UNIT,
        guest_name: long,
        guest_email: email,
        guest_note:
          "Poznámka ".repeat(60) + "bezmedzerovýdlhýtextbezmedzerovýdlhýtextbezmedzerovýdlhýtext",
        adults: 2,
        currency: "EUR",
        total_cents: 140000,
        lines: [
          {
            kind: "accommodation",
            label: "Ubytovanie s veľmi dlhým názvom položky rozpisu, ktorý sa musí zalomiť",
            quantity: 2,
            unit_amount_cents: 70000,
            amount_cents: 140000,
          },
        ],
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      },
    })
    .single();
  if (error) throw error;
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(
    `${ADMIN_URL}/admin/reservations?panel=reservation:${(created as { id: string }).id}`,
  );
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText("Maximiliána");
  // Z26: property documents the guest gets are listed too; the upload form waits behind a button.
  await expect(panel).toContainText("Pre všetkých hostí objektu");
  await expect(panel.getByRole("link", { name: /upraviť pri objekte/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Nahrať dokument" })).toBeVisible();
  await expect(panel.getByLabel("Kedy ich hosť uvidí")).toHaveCount(0);
  await page.waitForTimeout(400);
  // Nothing sticks out of the panel and no two blocks of the summary overlap.
  const problems = await panel.evaluate((root) => {
    const box = root.getBoundingClientRect();
    const out: string[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1 || el.classList.contains("sr-only")) continue;
      if (r.right > box.right + 1 || r.left < box.left - 1)
        out.push(el.tagName + " " + el.className);
    }
    const scrollers = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (el) =>
        !el.classList.contains("sr-only") &&
        el.scrollWidth > el.clientWidth + 1 &&
        getComputedStyle(el).overflowX !== "visible",
    );
    for (const el of scrollers) out.push("scroll " + el.className);
    return out.slice(0, 5);
  });
  expect(problems).toEqual([]);
  if (info.project.name !== "mobile") {
    // Secondary sections are folded rows with a count.
    const history = panel.getByRole("button", { name: /História/ });
    await expect(history).toHaveAttribute("aria-expanded", "false");
    await history.click();
    await expect(history).toHaveAttribute("aria-expanded", "true");
  }
});

test("v1.1 settings lists: compact rows expand in place, add form behind a button", async ({
  page,
}) => {
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/blocks`);
  const add = page.getByRole("button", { name: "Pridať blokáciu" });
  await expect(page.locator("#from")).toHaveCount(0);
  await add.click();
  await expect(page.locator("#from")).toBeVisible();
  const row = page.getByRole("button", { name: /Nová blokácia/ });
  await expect(row).toHaveAttribute("aria-expanded", "true");
  expect(await serious(page, "blokácie")).toEqual([]);
  await page.goto(`${ADMIN_URL}/admin/services`);
  const first = page.locator("ul button[aria-expanded]").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  expect(await serious(page, "služby")).toEqual([]);
  await noHorizontalScroll(page);
});

test("Z25 admin entry: control center opens the client in a new tab, bar and audit", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const since = new Date().toISOString();
  await loginPlatformAdmin(page, ADMIN_URL);
  // Own pages of the control center, graphite menu without "Do administrácie".
  for (const [href, title] of [
    ["/platform/modules", "Moduly"],
    ["/platform/status", "Stav systému"],
    ["/platform/audit", "Záznam zmien"],
  ] as const) {
    await page.goto(`${ADMIN_URL}${href}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
  await expect(page.locator("aside")).not.toContainText("Do administrácie");
  await page.goto(`${ADMIN_URL}/platform?panel=tenant:${STROMY}`);
  const panel = page.getByRole("dialog");
  await expect(panel).not.toContainText("booking-platform.test");
  await expect(panel).not.toContainText(".localhost");
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    panel.getByRole("link", { name: /Otvoriť administráciu/ }).click(),
  ]);
  await tab.waitForURL(/\/admin$/);
  await expect(tab.getByRole("status")).toContainText("Prezeráš ako správca: Chalet STRÖMY");
  await expect(tab.getByRole("heading", { level: 1 })).toBeVisible();
  const { data: entries } = await db
    .from("audit_log")
    .select("id")
    .eq("tenant_id", STROMY)
    .eq("action", "admin.entered")
    .gte("created_at", since);
  expect(entries?.length ?? 0).toBeGreaterThan(0);
  await tab.getByRole("link", { name: "Späť do riadiaceho centra" }).click();
  await tab.waitForURL(/\/platform$/);
  await tab.goto(`${ADMIN_URL}/admin`);
  await expect(tab.getByText("Prezeráš ako správca")).toHaveCount(0);
});

test("Z25 owner with one accommodation: no picker, no control center, no new property", async ({
  page,
}, info) => {
  await loginAs(page, ADMIN_URL, "info+jana@obrazne.sk");
  await page.waitForURL(/\/admin/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepnúť ubytovanie" })).toHaveCount(0);
  if (info.project.name !== "mobile") {
    await expect(page.locator("aside")).not.toContainText("Riadiace centrum");
  }
  await page.goto(`${ADMIN_URL}/admin/properties`);
  await expect(page.getByText("Nový objekt")).toHaveCount(0);
  await page.goto(`${ADMIN_URL}/platform`);
  await expect(page.getByText("Riadiace centrum je len pre správcu platformy.")).toBeVisible();
});
