import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, TENANT_UNIT, TEST_DOMAIN, freeStay, service } from "./helpers";

// Pinned columns of the guest side (Z74, pripomienka 64): after scrolling, the top of the pinned stay card is below the
// pinned tabs of the account (one CSS variable, measured); on /r (no tabs) it keeps the gap from the window's top; a
// column taller than the window is not pinned. Computers only (the column is pinned from 1024 px). Demo client.

const db = service();

async function stay(email: string) {
  const s = await freeStay(2);
  const { data, error } = await db.rpc("create_reservation", {
    p: {
      tenant_id: TENANT,
      property_id: TENANT_PROPERTY,
      unit_id: TENANT_UNIT,
      guest_name: "Lišta Testovacia",
      guest_email: email,
      adults: 2,
      currency: "EUR",
      total_cents: 64000,
      status: "confirmed",
      lines: [
        {
          kind: "accommodation",
          label: "Ubytovanie",
          quantity: 2,
          unit_amount_cents: 32000,
          amount_cents: 64000,
        },
      ],
      check_in: s.checkIn,
      check_out: s.checkOut,
    },
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as { id: string; access_token: string };
}

/** Top of the pinned column and bottom of the pinned bars (0 without bars), after scrolling down. */
async function afterScroll(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const col = document.querySelector("[data-guest-sticky]")!;
    const bars = [...document.querySelectorAll("[data-sticky-bar]")].map(
      (el) => el.getBoundingClientRect().bottom,
    );
    return {
      top: col.getBoundingClientRect().top,
      bar: Math.max(0, ...bars),
      position: getComputedStyle(col).position,
    };
  });
}

test("pinned stay card stays below the account's tabs; /r keeps the gap; too tall → not pinned", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "pinned only on computers");
  test.slow();
  const email = `e2e-sticky-${Date.now().toString(36)}@${TEST_DOMAIN}`;
  const r = await stay(email);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${GUEST_URL}/ucet`);
    await page.waitForURL(/\/ucet\/prihlasenie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslať kód" }).click();
    const firstDigit = page.getByLabel(/^Číslica 1 z/);
    await expect(firstDigit).toBeVisible();
    const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await firstDigit.fill(link.properties!.email_otp);
    await page.getByRole("button", { name: "Prihlásiť sa" }).click();
    await page.waitForURL(new RegExp(`/ucet/pobyt/${r.id}$`));

    const inAccount = await afterScroll(page);
    expect(inAccount.position).toBe("sticky");
    expect(inAccount.bar).toBeGreaterThan(40);
    // Below the tabs with a gap, not under them.
    expect(inAccount.top).toBeGreaterThanOrEqual(inAccount.bar + 16);

    // /r has no tabs: the gap from the top of the window.
    await page.goto(`${GUEST_URL}/r/${r.access_token}`);
    const byLink = await afterScroll(page);
    expect(byLink.position).toBe("sticky");
    expect(byLink.bar).toBe(0);
    expect(byLink.top).toBeGreaterThanOrEqual(16);

    // A window lower than the card: not pinned, so its bottom can be reached.
    await page.setViewportSize({ width: 1280, height: 420 });
    await expect(page.locator("[data-guest-sticky]").first()).toHaveAttribute("data-too-tall", "");
    expect((await afterScroll(page)).position).toBe("static");
  } finally {
    await db.from("email_outbox").delete().eq("reservation_id", r.id);
    await db.from("reservations").delete().eq("id", r.id);
    await db.from("record_history").delete().eq("tenant_id", TENANT).eq("record_id", r.id);
  }
});
