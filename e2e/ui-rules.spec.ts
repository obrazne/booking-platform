import { expect, test } from "@playwright/test";
import { ADMIN_URL, GUEST_URL } from "../playwright.config";
import { TENANT, TENANT_PROPERTY, loginOwner, markToursSeen, service } from "./helpers";

// Interface rules 1–2 (Z54, docs/pravidla-rozhrania.md): fields are white with an edge of 3 : 1 on every surface,
// a stay in the admin calendar shows a preview under the mouse — on touch the first tap, the second opens the detail.

/** Contrast of two computed CSS colours "rgb(r, g, b)". */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/\d+/g)!.slice(0, 3).map(Number);
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(r!) + 0.7152 * ch(g!) + 0.0722 * ch(bl!);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Field colours and the background of the nearest surface that paints one. */
async function fieldsOn(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .slice(0, 12)
      .map((el) => {
        const s = getComputedStyle(el);
        let p = el.parentElement;
        let around = "rgb(255, 255, 255)";
        while (p) {
          const bg = getComputedStyle(p).backgroundColor;
          if (bg && !bg.startsWith("rgba(0, 0, 0, 0)") && bg !== "transparent") {
            around = bg;
            break;
          }
          p = p.parentElement;
        }
        return {
          name: el.getAttribute("name") ?? el.id,
          bg: s.backgroundColor,
          edge: s.borderTopColor,
          around,
        };
      }),
  );
}

test("fields are white with a 3 : 1 edge — administration and guest account", async ({ page }) => {
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/properties/${TENANT_PROPERTY}`);
  const admin = await fieldsOn(
    page,
    "main input:not([type=checkbox]):not([type=hidden]), main select, main textarea",
  );
  expect(admin.length).toBeGreaterThan(5);
  for (const f of admin) {
    expect(f.bg, f.name).toBe("rgb(255, 255, 255)");
    expect(contrast(f.edge, f.around), f.name).toBeGreaterThanOrEqual(3);
  }
  // The guest page: the date fields of the cart and the search of the guest login.
  await page.context().clearCookies();
  await page.goto(`${GUEST_URL}/ucet/prihlasenie`);
  const guest = await fieldsOn(page, "input:not([type=hidden]):not([type=checkbox])");
  expect(guest.length).toBeGreaterThan(0);
  for (const f of guest) expect(contrast(f.edge, f.around), f.name).toBeGreaterThanOrEqual(3);
});

test("calendar: a stay shows a preview — hover on PC, first tap on a phone", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  const db = service();
  // A confirmed stay of the demo data (guest, dates, amount).
  const { data: res } = await db
    .from("reservations")
    .select("id, guest_name, items:reservation_items(check_in)")
    .eq("tenant_id", TENANT)
    .eq("status", "confirmed")
    .like("guest_note", "DEMO%")
    .limit(1)
    .single();
  test.skip(!res, "no confirmed demo stay — run npm run demo-data");
  await markToursSeen("qa@booking-platform.test");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/calendar?month=${res!.items[0]!.check_in.slice(0, 7)}`);
  const bar = page
    .getByRole("button", { name: new RegExp(`^${res!.guest_name}`) })
    .filter({ visible: true })
    .first();
  const preview = page.getByRole("tooltip");
  if (!mobile) {
    await bar.hover();
    await expect(preview).toContainText(res!.guest_name);
    await expect(preview).toContainText(/noc/);
    await expect(preview).toContainText("€");
    await page.mouse.move(2, 2);
    await expect(preview).toBeHidden();
  } else {
    await bar.tap();
    await expect(preview).toContainText(res!.guest_name);
    await expect(preview).toContainText("Ťuknite znova");
    await bar.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
});
