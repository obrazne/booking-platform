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
  await db.from("push_subscriptions").delete().like("endpoint", `https://push.${TEST_DOMAIN}/%`);
  const { data: docs } = await db
    .from("documents")
    .select("id, storage_path")
    .eq("tenant_id", STROMY)
    .eq("title->>sk", "E2E poriadok");
  if (docs?.length) {
    await db.storage.from("guest-documents").remove(docs.map((d) => d.storage_path));
    await db
      .from("documents")
      .delete()
      .in(
        "id",
        docs.map((d) => d.id),
      );
  }
  // Login identities created by the guest account test.
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (users?.users ?? []).filter(
    (u) => u.email?.startsWith("e2e-") && u.email.endsWith(`@${TEST_DOMAIN}`),
  );
  for (const u of testUsers) await db.auth.admin.deleteUser(u.id);
  await db
    .from("guest_auth_attempts")
    .delete()
    .eq("tenant_id", STROMY)
    .like("email", `%@${TEST_DOMAIN}`);
  await db.from("notifications").delete().like("dedupe_key", "e2e:%");
  // Clients created by the control center tests.
  await db.from("tenants").delete().like("slug", "e2e-%");
  // Holds from carts that reached step 3 without booking (at most 3 per unit — tests would block each other).
  await db.from("occupancy").delete().eq("tenant_id", STROMY).eq("kind", "hold");
  console.log(`[e2e] cleanup: ${ids.length} reservations, ${testUsers.length} guest logins`);
}
