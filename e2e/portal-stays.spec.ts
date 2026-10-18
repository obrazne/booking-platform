import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT } from "./helpers";

// Stays from portals (Z58, linka B): a test calendar of the Ukážkový klient (never STRÖMY) sends an Airbnb stay with
// a code and the phone's last digits → Rezervácie › Z portálov (filter, panel, calendar link) → Príchody show it with
// the portal's label → the reservation list is ordered by arrival and has one search and one "Ručná rezervácia".

const UNIT = "c0000000-0000-4000-8000-000000000061"; // Stan Tri koruny (Glamping Lúka)
const db = service();
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function serious(page: Page, include?: string) {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (include) axe = axe.include(include);
  const r = await axe.analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

/** Two free nights of the unit within the next weeks (arrivals window), else null. */
async function freeSoon(): Promise<{ start: string; end: string } | null> {
  const from = new Date();
  const to = new Date(Date.now() + 40 * 86_400_000);
  const { data } = await db.rpc("unit_busy_nights", {
    p_unit_id: UNIT,
    p_from: iso(from),
    p_to: iso(to),
  });
  const busy = new Set<string>();
  for (const r of (data ?? []) as unknown[]) {
    const v = String((r as { nights?: string }).nights ?? r);
    const m = /(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})/.exec(v);
    if (!m) {
      busy.add(v);
      continue;
    }
    for (let d = new Date(`${m[1]}T00:00:00Z`); iso(d) < m[2]!; d.setUTCDate(d.getUTCDate() + 1))
      busy.add(iso(d));
  }
  for (let i = 3; i < 28; i++) {
    const a = new Date(Date.now() + i * 86_400_000);
    const b = new Date(Date.now() + (i + 1) * 86_400_000);
    if (!busy.has(iso(a)) && !busy.has(iso(b)))
      return { start: iso(a), end: iso(new Date(Date.now() + (i + 2) * 86_400_000)) };
  }
  return null;
}

test("stays from portals: list, panel, arrivals; reservations by arrival", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  const stamp = Date.now().toString(36).toUpperCase();
  const code = `HM${stamp}`;
  const { data: checkin } = await db
    .from("tenant_modules")
    .select("status, trial_ends_at")
    .eq("tenant_id", TENANT)
    .eq("module_key", "checkin")
    .maybeSingle();
  let channelId: string | null = null;
  try {
    const soon = await freeSoon();
    test.skip(!soon, "no two free nights of the test unit in the next weeks");
    const { data: channel, error } = await db
      .from("ical_channels")
      .insert({
        tenant_id: TENANT,
        unit_id: UNIT,
        name: `E2E Airbnb ${stamp}`,
        source: "airbnb",
        import_url: "https://example.invalid/e2e-portal.ics",
        active: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    channelId = channel.id;
    const { error: e2 } = await db.rpc("ical_apply", {
      p_channel_id: channelId,
      p_events: [
        {
          uid: `e2e-${stamp}@airbnb.com`,
          start: soon!.start,
          end: soon!.end,
          summary: "Reserved",
          details: {
            url: `https://www.airbnb.com/hosting/reservations/details/${code}`,
            code,
            phone4: "4321",
          },
        },
      ],
    });
    if (e2) throw e2;
    await db
      .from("tenant_modules")
      .upsert({ tenant_id: TENANT, module_key: "checkin", status: "active", trial_ends_at: null });

    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/portal-stays?portal=airbnb`);
    await expect(page.getByRole("heading", { level: 1, name: "Pobyty z portálov" })).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(code) });
    await expect(row).toContainText("Airbnb");
    await expect(row).toContainText("tel. …4321");
    expect(await serious(page)).toEqual([]);
    await row.click();
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText(`E2E Airbnb ${stamp}`);
    await expect(panel).toContainText("…4321");
    await expect(panel.getByRole("link", { name: "Otvoriť na portáli ↗" })).toHaveAttribute(
      "href",
      `https://www.airbnb.com/hosting/reservations/details/${code}`,
    );
    await expect(panel.getByRole("link", { name: "Zobraziť v kalendári" })).toHaveAttribute(
      "href",
      new RegExp(`/admin/calendar\\?month=${soon!.start.slice(0, 7)}&unit=${UNIT}&highlight=`),
    );
    await page.waitForTimeout(400);
    expect(await serious(page, '[role="dialog"]')).toEqual([]);

    // Príchody: the portal's stay with its label.
    await page.goto(`${ADMIN_URL}/admin/arrivals`);
    const arrival = page.getByRole("link", { name: new RegExp(`Airbnb · ${code}`) });
    await expect(arrival).toContainText("z portálu");

    // Reservation list: by arrival, one search, one "Ručná rezervácia" (top bar).
    await page.goto(`${ADMIN_URL}/admin/reservations`);
    await expect(page.getByRole("searchbox")).toHaveCount(1);
    await expect(
      page.getByRole("main").getByRole("link", { name: /Ručná rezervácia/ }),
    ).toHaveCount(0);
    const { data: order } = await db
      .from("reservations")
      .select("number, arrival_order")
      .eq("tenant_id", TENANT)
      .order("arrival_order")
      .limit(1);
    const first = page.locator('[role="table"] a[role="row"]').first();
    await expect(first).toContainText(order![0]!.number);
  } finally {
    if (channelId) {
      await db
        .from("email_outbox")
        .delete()
        .eq("tenant_id", TENANT)
        .eq("kind", "owner_ical_conflict")
        .eq("payload->>channel_id", channelId);
      await db.from("ical_channels").delete().eq("id", channelId);
    }
    if (checkin)
      await db
        .from("tenant_modules")
        .update(checkin)
        .eq("tenant_id", TENANT)
        .eq("module_key", "checkin");
    else
      await db.from("tenant_modules").delete().eq("tenant_id", TENANT).eq("module_key", "checkin");
  }
});
