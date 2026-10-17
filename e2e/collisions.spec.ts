import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../playwright.config";
import { loginOwner, markToursSeen, service, TENANT, TEST_DOMAIN } from "./helpers";

// Collisions of calendars (Z42, linka B): a test calendar of the Ukážkový klient (never STRÖMY) reports dates that
// are already booked here → Rezervácie › Kolízie → the panel says what collides with what → Otvoriť rezerváciu →
// back → Označiť ako vyriešené. A test channel of its own, removed after the run.

const PROPERTY = "b0000000-0000-4000-8000-000000000006"; // Glamping Lúka
const UNIT = "c0000000-0000-4000-8000-000000000061"; // Stan Tri koruny
const db = service();

test("owner sees what collides, opens the reservation and marks the collision as resolved", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop");
  // The collision rings the bell; a phone with push for the demo client would get it — never in a test.
  const { count: phones } = await db
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT)
    .contains("kinds", ["calendar_conflict"]);
  test.skip((phones ?? 0) > 0, "a device gets push about collisions of the demo client");
  const stamp = Date.now().toString(36);
  let reservation: { id: string; number: string } | null = null;
  let channelId: string | null = null;
  try {
    // A stay next year (retry when the unit is taken), then the portal says the same dates are closed.
    const year = new Date().getUTCFullYear() + 1;
    for (let attempt = 0; attempt < 30 && !reservation; attempt++) {
      const start = new Date(Date.UTC(year, 2, 1 + Math.floor(Math.random() * 60)));
      const checkIn = start.toISOString().slice(0, 10);
      start.setUTCDate(start.getUTCDate() + 3);
      const checkOut = start.toISOString().slice(0, 10);
      const { data, error } = await db
        .rpc("create_reservation", {
          p: {
            tenant_id: TENANT,
            property_id: PROPERTY,
            unit_id: UNIT,
            guest_name: `E2E Kolízia ${stamp}`,
            guest_email: `e2e-collision-${stamp}+b@${TEST_DOMAIN}`,
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
      if (error) {
        if (!/overlap|23P01|unavailable/i.test(`${error.code} ${error.message}`)) throw error;
        continue;
      }
      const r = data as { id: string; number: string };
      const { data: full } = await db.from("reservations").select("number").eq("id", r.id).single();
      reservation = { id: r.id, number: full!.number };
      const { data: channel, error: e2 } = await db
        .from("ical_channels")
        .insert({
          tenant_id: TENANT,
          unit_id: UNIT,
          name: `E2E Booking ${stamp}`,
          source: "booking",
          import_url: "https://example.invalid/e2e.ics",
          // Never synchronised by the worker in between: the URL does not exist.
          active: false,
        })
        .select("id")
        .single();
      if (e2) throw e2;
      channelId = channel.id;
      const { error: e3 } = await db.rpc("ical_apply", {
        p_channel_id: channelId,
        p_events: [
          { uid: `e2e-${stamp}`, start: checkIn, end: checkOut, summary: "CLOSED - Not available" },
        ],
      });
      if (e3) throw e3;
      // The owner's e-mail about the collision is not sent (staging redirects e-mails to Martin).
      await db
        .from("email_outbox")
        .update({ status: "skipped", last_error: "E2E — neodoslané" })
        .eq("tenant_id", TENANT)
        .eq("kind", "owner_ical_conflict")
        .eq("payload->>channel_id", channelId);
    }
    if (!reservation || !channelId) throw new Error("No free stay found");
    const { data: collision } = await db
      .from("occupancy")
      .select("id, conflict")
      .eq("ical_channel_id", channelId)
      .single();
    expect(collision?.conflict).toBe(true);

    await markToursSeen("qa@booking-platform.test");
    await loginOwner(page, ADMIN_URL);
    await page.goto(`${ADMIN_URL}/admin/collisions`);
    await expect(page.getByRole("heading", { level: 1, name: "Kolízie kalendárov" })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`Rezervácia ${reservation.number}`) }).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText(
      `Na Booking.com je termín zavretý, u vás je rezervácia ${reservation.number}`,
    );
    await expect(panel).toContainText(`E2E Kolízia ${stamp}`);
    await expect(panel).toContainText("spoločné 3 noci");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

    // Otvoriť rezerváciu → its panel; back to the collision.
    await panel.getByRole("link", { name: "Otvoriť rezerváciu" }).last().click();
    await expect(page).toHaveURL(new RegExp(`panel=reservation(:|%3A)${reservation.id}`));
    await expect(page.getByRole("dialog")).toContainText(`E2E Kolízia ${stamp}`);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`panel=collision(:|%3A)${collision!.id}`));

    await page.getByRole("dialog").getByRole("button", { name: "Označiť ako vyriešené" }).click();
    await expect
      .poll(
        async () =>
          (
            await db
              .from("occupancy")
              .select("conflict_resolved_at")
              .eq("id", collision!.id)
              .single()
          ).data?.conflict_resolved_at,
      )
      .not.toBeNull();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Znovu otvoriť" }),
    ).toBeVisible();
  } finally {
    if (channelId) {
      const { data: rows } = await db
        .from("occupancy")
        .select("id")
        .eq("ical_channel_id", channelId);
      const ids = (rows ?? []).map((r) => r.id);
      await db.from("audit_log").delete().eq("tenant_id", TENANT).in("entity_id", ids);
      await db.from("record_history").delete().eq("tenant_id", TENANT).in("record_id", ids);
      for (const id of ids)
        await db.from("notifications").delete().like("dedupe_key", `calendar_conflict:${id}:%`);
      await db
        .from("email_outbox")
        .delete()
        .eq("tenant_id", TENANT)
        .eq("kind", "owner_ical_conflict")
        .eq("payload->>channel_id", channelId);
      await db.from("ical_channels").delete().eq("id", channelId);
    }
    if (reservation) {
      await db.from("email_outbox").delete().eq("reservation_id", reservation.id);
      await db.from("reservations").delete().eq("id", reservation.id);
      await db
        .from("record_history")
        .delete()
        .eq("tenant_id", TENANT)
        .eq("record_id", reservation.id);
    }
  }
});
