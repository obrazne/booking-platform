import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { TENANT, loginOwner, loginPlatformAdmin, service } from "./helpers";

// Push notifications (Z33): switch on with the browser's permission, the device is saved, kinds, test notification
// (the endpoint is a *.test host, so the server records it as sent without contacting a push service), removal.

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);

/** The browser's push service is replaced by a fake subscription — real delivery is not tested. */
async function fakePushService(page: Page, endpoint: string) {
  await page.context().grantPermissions(["notifications"], { origin: ADMIN_URL });
  await page.addInitScript((url) => {
    const fake = {
      endpoint: url,
      expirationTime: null,
      options: {},
      getKey: () => null,
      unsubscribe: async () => true,
      toJSON: () => ({
        endpoint: url,
        expirationTime: null,
        keys: { p256dh: `B${"A".repeat(86)}`, auth: "e2e-auth-secret-0001" },
      }),
    };
    PushManager.prototype.subscribe = async function () {
      localStorage.setItem("e2e-push", "1");
      return fake as unknown as PushSubscription;
    };
    PushManager.prototype.getSubscription = async function () {
      return (localStorage.getItem("e2e-push") ? fake : null) as unknown as PushSubscription;
    };
  }, endpoint);
}

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("owner switches push on for the device, picks kinds and sends a test", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const endpoint = `https://push.booking-platform.test/e2e-owner-${stamp}`;
  const { data: before } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "push")
    .maybeSingle();
  await db
    .from("tenant_modules")
    .upsert({ tenant_id: TENANT, module_key: "push", status: "active", trial_ends_at: null });
  try {
    await fakePushService(page, endpoint);
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/settings/notifications`);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Upozornenia na tomto zariadení" }),
    });
    await section.getByRole("button", { name: "Zapnúť upozornenia na tomto zariadení" }).click();
    await expect(section.getByText("Zapnuté na tomto zariadení")).toBeVisible();
    const row = async () =>
      (
        await db
          .from("push_subscriptions")
          .select("id, tenant_id, kinds, last_success_at")
          .eq("endpoint", endpoint)
          .maybeSingle()
      ).data;
    expect((await row())?.tenant_id).toBe(TENANT);
    expect([...((await row())?.kinds ?? [])].sort()).toEqual(
      ["calendar_conflict", "cancel_request", "reservation_new", "sync_failed"].sort(),
    );
    await expect(
      section.getByRole("listitem").filter({ hasText: "toto zariadenie" }),
    ).toBeVisible();

    await section.getByRole("checkbox", { name: /Platba prijatá/ }).click();
    await expect.poll(async () => (await row())?.kinds.includes("payment_received")).toBe(true);

    await section.getByRole("button", { name: "Poslať skúšobné upozornenie" }).click();
    await expect(section.getByRole("status")).toHaveText("Skúšobné upozornenie je odoslané.");
    expect((await row())?.last_success_at).not.toBeNull();
    await noSeriousA11y(page);

    await section.getByRole("button", { name: "Vypnúť na tomto zariadení" }).click();
    await expect.poll(row).toBeNull();
    await expect(
      section.getByRole("button", { name: "Zapnúť upozornenia na tomto zariadení" }),
    ).toBeVisible();
  } finally {
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (before) {
      await db
        .from("tenant_modules")
        .update({ status: before.status, trial_ends_at: before.trial_ends_at })
        .eq("tenant_id", TENANT)
        .eq("module_key", "push");
    } else {
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "push");
    }
  }
});

test("owner without the module sees only a sentence about it", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const { data: on } = await db
    .from("tenant_modules")
    .select("status")
    .eq("tenant_id", TENANT)
    .eq("module_key", "push")
    .maybeSingle();
  test.skip(Boolean(on && on.status !== "off"), "push is on for the demo client on staging");
  await loginOwner(page, ADMIN_URL);
  await page.goto(`${ADMIN_URL}/admin/settings/notifications`);
  await expect(page.getByText(/súčasťou modulu Push notifikácie/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Zapnúť upozornenia/ })).toHaveCount(0);
});

test("platform admin gets platform notifications on the device without any module", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const db = service();
  const endpoint = `https://push.booking-platform.test/e2e-admin-${stamp}`;
  try {
    await fakePushService(page, endpoint);
    await loginPlatformAdmin(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/platform/notifications`);
    await expect(page.getByRole("heading", { level: 1, name: "Upozornenia" })).toBeVisible();
    await page.getByRole("button", { name: "Zapnúť upozornenia na tomto zariadení" }).click();
    await expect(page.getByText("Zapnuté na tomto zariadení")).toBeVisible();
    const { data } = await db
      .from("push_subscriptions")
      .select("tenant_id, kinds")
      .eq("endpoint", endpoint)
      .single();
    expect(data?.tenant_id).toBeNull();
    expect(data?.kinds).toContain("client_new");
    await page.getByRole("button", { name: "Poslať skúšobné upozornenie" }).click();
    await expect(page.getByRole("status")).toHaveText("Skúšobné upozornenie je odoslané.");
    await noSeriousA11y(page);
  } finally {
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
});
