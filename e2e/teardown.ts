import { service, STROMY, TEST_DOMAIN } from "./helpers";

/** Removes everything the browser tests created on staging. */
export default async function teardown() {
  const db = service();
  const { data: res } = await db
    .from("reservations")
    .select("id")
    .eq("tenant_id", STROMY)
    .like("guest_email", `%@${TEST_DOMAIN}`);
  const ids = (res ?? []).map((r) => r.id);
  if (ids.length > 0) await db.from("reservations").delete().in("id", ids);
  await db.from("guests").delete().eq("tenant_id", STROMY).like("email", `%@${TEST_DOMAIN}`);
  await db
    .from("occupancy")
    .delete()
    .eq("tenant_id", STROMY)
    .eq("kind", "block")
    .like("label", "E2E%");
  await db.from("ical_channels").delete().eq("tenant_id", STROMY).like("name", "E2E%");
  console.log(`[e2e] cleanup: ${ids.length} reservations`);
}
