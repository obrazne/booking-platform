import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, TENANT_UNIT, TEST_DOMAIN, freeStay, service } from "./helpers";

// Stay page of the guest (Z70, pripomienky 58–59): the contact is only in the foot of the green stay card — no separate
// card that slid under the sticky one; cards in the right column never overlap while scrolling (1280×800, 1440×900);
// the cards of the guest side have their own shade and edge (rule 1). Demo client, test guest, deleted at the end.

async function stay(status: "pending_payment" | "confirmed", tag: string) {
  const db = service();
  const s = await freeStay(2);
  const { data, error } = await db.rpc("create_reservation", {
    p: {
      tenant_id: TENANT,
      property_id: TENANT_PROPERTY,
      unit_id: TENANT_UNIT,
      guest_name: "Kontakt Testovací",
      guest_email: `e2e-contact-${tag}-${Date.now()}@${TEST_DOMAIN}`,
      adults: 2,
      currency: "EUR",
      total_cents: 64000,
      status,
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

/** Boxes of the visible children of the right column overlap? */
async function overlaps(page: Page) {
  return page.locator("main aside").evaluate((aside) => {
    const boxes = [...aside.querySelectorAll(":scope > *, :scope > .lg\\:contents > *")]
      .filter(
        (el) =>
          (el as HTMLElement).offsetParent !== null && getComputedStyle(el).display !== "contents",
      )
      .map((el) => el.getBoundingClientRect());
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.top < b.bottom - 1 && b.top < a.bottom - 1 && a.left < b.right && b.left < a.right)
          return true;
      }
    return false;
  });
}

for (const status of ["pending_payment", "confirmed"] as const) {
  test(`stay page (${status}): one contact in the stay card, nothing slides under it`, async ({
    page,
  }, info) => {
    const db = service();
    const r = await stay(status, `${status}-${info.project.name}`);
    try {
      await page.goto(`${GUEST_URL}/r/${r.access_token}`);
      // The messages module adds "Napísať správu" to the foot; the old separate card ("Napíšte …") is gone.
      const write = page.getByRole("link", { name: "Napísať správu" }).filter({ visible: true });
      await expect(write).toHaveCount(1);
      await expect(page.getByRole("heading", { name: /^Napíšte/ })).toHaveCount(0);

      if (info.project.name === "desktop") {
        for (const size of [
          { width: 1280, height: 800 },
          { width: 1440, height: 900 },
        ]) {
          await page.setViewportSize(size);
          for (const y of [0, 400, 900, 1600, 3000]) {
            await page.evaluate((top) => window.scrollTo(0, top), y);
            await page.waitForTimeout(100);
            expect(await overlaps(page), `${size.width}×${size.height} at ${y}px`).toBe(false);
          }
        }
      }

      // Rule 1 on the guest side: no card white on the white page.
      const flat = await page.evaluate(() => {
        const white = (c: string) => /^rgba?\(255, 255, 255(, 1)?\)$/.test(c);
        return [...document.querySelectorAll("main [class*='rounded']")].filter((el) => {
          const s = getComputedStyle(el);
          const e = el as HTMLElement;
          return (
            e.offsetParent !== null &&
            e.offsetWidth > 240 &&
            e.offsetHeight > 70 &&
            parseFloat(s.paddingTop) >= 12 &&
            white(s.backgroundColor) &&
            !el.closest("[data-qr], form") &&
            e.tagName !== "BUTTON" &&
            e.tagName !== "A"
          );
        }).length;
      });
      expect(flat).toBe(0);

      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`),
      ).toEqual([]);
    } finally {
      await db.from("reservations").delete().eq("id", r.id);
    }
  });
}
