import { createClient } from "@supabase/supabase-js";
import type { Locator, Page } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

/**
 * Browser tests run against the demo client (Ukážkový klient, Chalet Pod Smrekom) — never against Chalet STRÖMY,
 * which has Jana's real Booking calendar since 17. 10. (Z41).
 */
export const TENANT = "a0000000-0000-4000-8000-000000000001";
export const TENANT_NAME = "Ukážkový klient";
export const TENANT_PROPERTY = "b0000000-0000-4000-8000-000000000001";
export const TENANT_UNIT = "c0000000-0000-4000-8000-000000000010";
export const PROPERTY_SLUG = "chalet-pod-smrekom";
export const PROPERTY_NAME = "Chalet Pod Smrekom";
export const TEST_DOMAIN = "booking-platform.test";

/** Service client for test setup and cleanup (staging only). */
export function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");
  if (/prod/i.test(url)) throw new Error("Refusing to run browser tests against production");
  return createClient(url, key, { auth: { persistSession: false } });
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** A free stay of `nights` nights in May–September next year (summer season, minimum 2 nights), random per run. */
export async function freeStay(
  nights = 3,
  avoid: string[] = [],
): Promise<{ checkIn: string; checkOut: string }> {
  const db = service();
  const year = new Date().getUTCFullYear() + 1;
  const from = `${year}-05-01`;
  const to = `${year}-09-30`;
  const { data } = await db.rpc("unit_busy_nights", {
    p_unit_id: TENANT_UNIT,
    p_from: from,
    p_to: to,
  });
  const busy = new Set([
    ...(data ?? []).map((r: { nights?: string }) => String(r.nights ?? r)),
    ...avoid,
  ]);
  const busyDays = new Set<string>();
  for (const range of busy) {
    // daterange "[a,b)" or a plain date
    const m = /(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})/.exec(range);
    if (!m) {
      busyDays.add(range);
      continue;
    }
    for (let d = new Date(`${m[1]}T00:00:00Z`); iso(d) < m[2]!; d.setUTCDate(d.getUTCDate() + 1))
      busyDays.add(iso(d));
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = new Date(`${from}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() + Math.floor(Math.random() * 140));
    const days = Array.from({ length: nights + 1 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return iso(d);
    });
    if (days.every((d) => !busyDays.has(d))) return { checkIn: days[0]!, checkOut: days[nights]! };
  }
  throw new Error("No free stay found");
}

/** Clicks arrival and departure in a calendar, paging months forward as needed. */
export async function pickStay(scope: Locator, checkIn: string, checkOut: string) {
  for (const date of [checkIn, checkOut]) {
    for (let i = 0; i < 24; i++) {
      const day = scope.locator(`button[data-date="${date}"]`).filter({ visible: true });
      if ((await day.count()) > 0) {
        await day.first().click();
        break;
      }
      await scope.getByRole("button", { name: "Nasledujúci mesiac" }).first().click();
    }
  }
}

/** Signs the QA owner in through a one-time link (scripts/qa-login-link.mjs does the same by hand). */
export async function loginOwner(page: Page, base: string) {
  const db = service();
  const email = "qa@booking-platform.test";
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  await db
    .from("memberships")
    .upsert(
      { tenant_id: TENANT, user_id: user.id, role: "owner" },
      { onConflict: "tenant_id,user_id" },
    );
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.context().addCookies([{ name: "active_tenant", value: TENANT, url: base }]);
  await page.goto(
    `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/admin`,
  );
  await page.waitForURL(/\/admin/);
}

/** Marks the "What's new" tours as seen, so the window does not cover the page under test. */
export async function markToursSeen(email: string) {
  const { TOURS } = await import("../src/core/tours/tours");
  const db = service();
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === email);
  if (user)
    await db
      .from("profiles")
      .update({ tours_seen: { owner: TOURS.owner.version, admin: TOURS.admin.version } })
      .eq("id", user.id);
}

/** Signs in the QA platform admin (qa-admin@booking-platform.test) for the control center. */
export async function loginPlatformAdmin(page: Page, base: string) {
  const db = service();
  const email = "qa-admin@booking-platform.test";
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  await db.from("platform_admins").upsert({ user_id: user.id }, { onConflict: "user_id" });
  await markToursSeen(email);
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(
    `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/platform`,
  );
  await page.waitForURL(/\/platform/);
}

/** "Čo je nové" in the side menu (phones: in the menu from the side). */
export async function openWhatsNew(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  else await page.locator("aside").hover();
  await page.getByRole("button", { name: "Čo je nové" }).filter({ visible: true }).click();
}

/** Signs in an existing test account through a one-time link (no e-mail is sent) — e.g. the test owner of the demo client. */
export async function loginAs(page: Page, base: string, email: string, next = "/admin") {
  const db = service();
  await markToursSeen(email);
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(
    `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=${next}`,
  );
}
