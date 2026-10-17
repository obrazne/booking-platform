import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_URL } from "../playwright.config";
import {
  freeStay,
  PROPERTY_SLUG,
  service,
  TENANT,
  TENANT_PROPERTY,
  TENANT_UNIT,
  TEST_DOMAIN,
} from "./helpers";

// Reviews for guests (Z38): the guest reviews a finished stay in the account (link from the invitation), gets
// the thanks with Google; once published the review is on the page with the average, the critical filter works and
// the structured data carry only verified reviews.

const stamp = Date.now().toString(36);
const GOOGLE = "https://g.page/r/e2e-demo/review";

async function noSeriousA11y(page: Page, include?: string) {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) axe = axe.include(include);
  const r = await axe.analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("guest reviews a finished stay, the review appears on the page after publication", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const email = `e2e-review-${stamp}@${TEST_DOMAIN}`;
  const { data: module } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "reviews")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "reviews", status: "active", trial_ends_at: null });
  const { data: settings } = await db
    .from("tenant_settings")
    .select("google_review_url")
    .eq("tenant_id", TENANT)
    .maybeSingle();
  await db.from("tenant_settings").update({ google_review_url: GOOGLE }).eq("tenant_id", TENANT);

  // A stay that ended two days ago (created in a free term, then moved into the past).
  const stay = await freeStay(3);
  const { data: created, error } = await db
    .rpc("create_reservation", {
      p: {
        tenant_id: TENANT,
        property_id: TENANT_PROPERTY,
        unit_id: TENANT_UNIT,
        guest_name: "Recenzia Testová",
        guest_email: email,
        adults: 2,
        currency: "EUR",
        total_cents: 60000,
        status: "confirmed",
        lines: [
          {
            kind: "accommodation",
            label: "Pobyt",
            quantity: 1,
            unit_amount_cents: 60000,
            amount_cents: 60000,
          },
        ],
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      },
    })
    .single();
  if (error) throw error;
  const id = (created as { id: string }).id;
  const day = (offset: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  await db
    .from("reservation_items")
    .update({ check_in: day(-5), check_out: day(-2) })
    .eq("reservation_id", id);
  await db.from("reservations").update({ status: "completed" }).eq("id", id);

  try {
    // The invitation link → login → the review in the stay.
    await page.goto(`${GUEST_URL}/ucet/pobyt/${id}/hodnotenie`);
    await page.waitForURL(/\/ucet\/prihlasenie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslať kód" }).click();
    const firstDigit = page.getByLabel(/^Číslica 1 z/);
    await expect(firstDigit).toBeVisible();
    const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
    await firstDigit.fill(link.properties!.email_otp);
    await page.getByRole("button", { name: "Prihlásiť sa" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ucet/prihlasenie"));
    await page.goto(`${GUEST_URL}/ucet/pobyt/${id}/hodnotenie`);
    await page.waitForURL(new RegExp(`/ucet/pobyt/${id}`));

    const form = page.getByRole("region", { name: /Ako sa vám u nás páčilo/ });
    await expect(form).toBeVisible();
    await expect(form.getByRole("button", { name: "Odoslať hodnotenie" })).toBeDisabled();
    await form.getByRole("button", { name: "2 z 5 — Nič moc" }).click();
    await form.getByRole("button", { name: "Čistota: 3 z 5" }).click();
    await form
      .getByRole("textbox", { name: "Čo by ste povedali ďalším hosťom?" })
      .fill(`E2E kritická recenzia ${stamp}`);
    await expect(form.getByRole("textbox", { name: "Zobraziť ako" })).toHaveValue("Recenzia T.");
    await noSeriousA11y(page, "#hodnotenie");
    await form.getByRole("button", { name: "Odoslať hodnotenie" }).click();

    await expect(page.getByText("Ďakujeme, Recenzia.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ohodnotiť aj na Google/ })).toHaveAttribute(
      "href",
      GOOGLE,
    );
    const { data: review } = await db
      .from("reviews")
      .select("id, status, rating, rating_cleanliness, display_name")
      .eq("reservation_id", id)
      .single();
    expect(review).toMatchObject({
      status: "submitted",
      rating: 2,
      rating_cleanliness: 3,
      display_name: "Recenzia T.",
    });

    // The owner publishes it (or 72 h pass) → on the page, among the critical ones.
    await db.from("reviews").update({ status: "published" }).eq("id", review!.id);
    await page.goto(`${GUEST_URL}/p/${PROPERTY_SLUG}`);
    const section = page.locator("#recenzie");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText(/z \d+ overen/)).toBeVisible();
    await section.getByRole("button", { name: "Kritické (3★ a menej)" }).click();
    await expect(section.getByText(`E2E kritická recenzia ${stamp}`)).toBeVisible();
    await expect(section.getByText("5 z 5 hviezdičiek")).toHaveCount(0);
    await noSeriousA11y(page, "#recenzie");

    // Structured data: the average of verified reviews only.
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const json = JSON.parse(ld ?? "{}");
    expect(json.aggregateRating?.["@type"]).toBe("AggregateRating");
    expect(json.aggregateRating?.reviewCount).toBeGreaterThan(0);
  } finally {
    await db.from("reservations").delete().eq("id", id);
    await db
      .from("tenant_settings")
      .update({ google_review_url: settings?.google_review_url ?? null })
      .eq("tenant_id", TENANT);
    if (module)
      await db
        .from("tenant_modules")
        .update(module)
        .eq("tenant_id", TENANT)
        .eq("module_key", "reviews");
    else
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "reviews");
  }
});
