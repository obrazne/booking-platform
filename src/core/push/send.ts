import "server-only";
import webpush from "web-push";
import { createTranslator } from "next-intl";
import { isEnabledStatus } from "@/core/modules/resolve";
import { notificationText } from "@/core/notifications/text";
import { defaultLocale } from "@/i18n/config";
import messages from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestEndpoint, selectRecipients, type PushDevice } from "./recipients";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type SendResult = "sent" | "gone" | "failed" | "not_configured";

/** VAPID keys come from the environment (names in .env.example); without them push is off. */
export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}

type Row = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failures: number;
};

/**
 * Sends one push and keeps the device's state: success time, failures; 404/410 (the browser dropped the
 * subscription) deletes the device. Test endpoints are recorded as sent without contacting anything.
 */
export async function sendToDevice(device: Row, payload: PushPayload): Promise<SendResult> {
  if (!pushConfigured()) return "not_configured";
  const admin = createAdminClient();
  if (!isTestEndpoint(device.endpoint)) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24,
          urgency: "high",
          vapidDetails: {
            subject: process.env.VAPID_SUBJECT!,
            publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            privateKey: process.env.VAPID_PRIVATE_KEY!,
          },
        },
      );
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", device.id);
        return "gone";
      }
      await admin
        .from("push_subscriptions")
        .update({ failures: device.failures + 1 })
        .eq("id", device.id);
      return "failed";
    }
  }
  await admin
    .from("push_subscriptions")
    .update({ last_success_at: new Date().toISOString(), failures: 0 })
    .eq("id", device.id);
  return "sent";
}

const t = createTranslator({ locale: defaultLocale, messages, namespace: "notifications" });
const tAll = createTranslator({ locale: defaultLocale, messages });

/** Push text of a notification — the same title, line and link as in the bell. */
export function pushPayload(n: {
  id: string;
  kind: string;
  data: unknown;
  target: string | null;
  audience: string;
}): PushPayload {
  const { title, body } = notificationText(
    { kind: n.kind, data: (n.data ?? {}) as Record<string, unknown> },
    t as never,
    tAll as never,
    defaultLocale,
  );
  const fallback = n.audience === "platform" ? "/platform" : "/admin";
  return { title, body, url: n.target ?? fallback, tag: n.id };
}

/**
 * Sends queued notifications (pinged by the database right after a notification is created, and every minute by the
 * job worker as a fallback). Recipients: see `selectRecipients`.
 */
export async function processPushQueue(): Promise<{ notifications: number; sent: number }> {
  if (!pushConfigured()) return { notifications: 0, sent: 0 };
  const admin = createAdminClient();
  const { data: ids } = await admin.rpc("claim_push_jobs", { p_limit: 50 });
  const list = (ids ?? []) as unknown as string[];
  if (!list.length) return { notifications: 0, sent: 0 };
  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;
  const { data: notices } = await admin
    .from("notifications")
    .select("id, tenant_id, audience, kind, data, target")
    .in("id", list);
  const { data: admins } = await admin.from("platform_admins").select("user_id");
  const platformAdmins = new Set((admins ?? []).map((a) => a.user_id));
  for (const n of notices ?? []) {
    const platform = n.audience === "platform";
    const devicesQuery = admin
      .from("push_subscriptions")
      .select("id, user_id, tenant_id, endpoint, p256dh, auth, kinds, failures")
      .contains("kinds", [n.kind]);
    const [{ data: rows }, { data: members }, { data: switchRow }, { data: reads }] =
      await Promise.all([
        platform ? devicesQuery.is("tenant_id", null) : devicesQuery.eq("tenant_id", n.tenant_id!),
        platform
          ? Promise.resolve({ data: [] as { user_id: string }[] })
          : admin.from("memberships").select("user_id").eq("tenant_id", n.tenant_id!),
        platform
          ? Promise.resolve({ data: null })
          : admin
              .from("tenant_modules")
              .select("status, trial_ends_at")
              .eq("tenant_id", n.tenant_id!)
              .eq("module_key", "push")
              .maybeSingle(),
        admin.from("notification_reads").select("user_id").eq("notification_id", n.id),
      ]);
    const devices: (PushDevice & Row)[] = (rows ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      tenantId: r.tenant_id,
      endpoint: r.endpoint,
      kinds: r.kinds,
      p256dh: r.p256dh,
      auth: r.auth,
      failures: r.failures,
    }));
    const chosen = selectRecipients(
      { audience: platform ? "platform" : "tenant", tenantId: n.tenant_id, kind: n.kind },
      devices,
      {
        moduleEnabled: switchRow
          ? isEnabledStatus(switchRow.status, switchRow.trial_ends_at, today)
          : false,
        members: new Set((members ?? []).map((m) => m.user_id)),
        platformAdmins,
        readBy: new Set((reads ?? []).map((r) => r.user_id)),
      },
    ) as (PushDevice & Row)[];
    const payload = pushPayload(n);
    const results = await Promise.all(chosen.map((d) => sendToDevice(d, payload)));
    sent += results.filter((r) => r === "sent").length;
  }
  return { notifications: list.length, sent };
}
