import "server-only";
import { createTranslator } from "next-intl";
import messagesSk from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageAnchor } from "./rules";

/** Default automatic messages (B11): created when the module is switched on, texts from the translations. */
export const DEFAULT_RULES: {
  key: "welcome" | "directions" | "check" | "departure" | "thanks";
  anchor: MessageAnchor;
  offsetDays: number;
  sendTime: string | null;
  enabled: boolean;
}[] = [
  { key: "welcome", anchor: "confirmed", offsetDays: 0, sendTime: null, enabled: true },
  { key: "directions", anchor: "check_in", offsetDays: -3, sendTime: "10:00", enabled: true },
  { key: "check", anchor: "check_in", offsetDays: 1, sendTime: "10:00", enabled: true },
  { key: "departure", anchor: "check_out", offsetDays: -1, sendTime: "18:00", enabled: false },
  { key: "thanks", anchor: "check_out", offsetDays: 1, sendTime: "11:00", enabled: true },
];
export const DEFAULT_QUICK_REPLIES = ["thanks", "late", "help"] as const;

/**
 * Default rules and quick replies of a client (Z45) — only when it has none yet (a rule the owner deleted is not
 * brought back; quick replies only when there are none). Texts from the translations (Slovak so far).
 */
export async function ensureMessageDefaults(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  // Only Slovak texts exist so far; other languages of the client fall back to them on the guest's side.
  const sk = createTranslator({
    locale: "sk",
    messages: messagesSk,
    namespace: "modules.messages.defaults",
  });
  const texts = (key: string) => ({ sk: sk(key as never) });

  const { data: existing } = await admin
    .from("message_rules")
    .select("key")
    .eq("tenant_id", tenantId);
  const have = new Set((existing ?? []).map((r) => r.key));
  const missing = DEFAULT_RULES.filter((r) => !have.has(r.key));
  if (missing.length && !(existing ?? []).length)
    await admin.from("message_rules").insert(
      missing.map((r, i) => ({
        tenant_id: tenantId,
        key: r.key,
        anchor: r.anchor,
        offset_days: r.offsetDays,
        send_time: r.sendTime,
        enabled: r.enabled,
        sort: i,
        name: texts(`rules.${r.key}.name`),
        body: texts(`rules.${r.key}.body`),
      })),
    );

  const { count } = await admin
    .from("quick_replies")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (!count) {
    await admin.from("quick_replies").insert(
      DEFAULT_QUICK_REPLIES.map((k, i) => ({
        tenant_id: tenantId,
        title: sk(`quick.${k}.title` as never),
        body: sk(`quick.${k}.body` as never),
        sort: i,
      })),
    );
  }
}
