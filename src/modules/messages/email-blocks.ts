import "server-only";
import { tr } from "@/core/i18n/localized";
import type { EmailBlock, EmailBlockArgs } from "@/core/modules/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { fillMessageText, ruleSendAt, type MessageAnchor } from "./rules";

/**
 * Automatic messages that reach the guest inside a core e-mail instead of their own (B11, no double e-mails):
 * the welcome (right after the confirmation) in the confirmation e-mail; a message due on the day of the arrival
 * instructions or of an upsell offer in that e-mail. The conversation gets the same text (messages_tick, email_via).
 */
export async function messageEmailBlocks(args: EmailBlockArgs): Promise<EmailBlock[]> {
  const admin = createAdminClient();
  const [{ data: rules }, { data: r }] = await Promise.all([
    admin
      .from("message_rules")
      .select("id, name, anchor, offset_days, send_time, body")
      .eq("tenant_id", args.tenantId)
      .eq("enabled", true)
      .order("sort"),
    admin
      .from("reservations")
      .select(
        "id, guest_name, locale, created_at, source, tenant:tenants(name, timezone, domains:tenant_domains(hostname, is_primary)), items:reservation_items(check_in, check_out), overrides:message_overrides(rule_id, skip, body), sent:messages(rule_id)",
      )
      .eq("id", args.reservationId)
      .single(),
  ]);
  if (!rules?.length || !r || r.source === "booking" || r.source === "airbnb") return [];
  const { data: settings } = await admin
    .from("tenant_settings")
    .select("contact_name")
    .eq("tenant_id", args.tenantId)
    .maybeSingle();
  const timeZone = r.tenant?.timezone ?? "Europe/Bratislava";
  const checkIn = r.items.map((i) => i.check_in).sort()[0] ?? "";
  const checkOut =
    r.items
      .map((i) => i.check_out)
      .sort()
      .at(-1) ?? "";
  const host =
    (r.tenant?.domains ?? [])
      .filter((d) => !d.hostname.endsWith(".localhost"))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0]?.hostname ?? null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  const localDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
  const sent = new Set((r.sent ?? []).map((m) => m.rule_id));

  return rules.flatMap((rule) => {
    const override = (r.overrides ?? []).find((o) => o.rule_id === rule.id);
    if (override?.skip) return [];
    const anchor = rule.anchor as MessageAnchor;
    const due =
      args.kind === "guest_confirmed"
        ? anchor === "confirmed" && rule.offset_days === 0
        : anchor !== "confirmed" &&
          !sent.has(rule.id) &&
          (() => {
            const at = ruleSendAt(
              {
                anchor,
                offsetDays: rule.offset_days,
                sendTime: rule.send_time?.slice(0, 5) ?? null,
              },
              { checkIn, checkOut, confirmedAt: null },
              timeZone,
            );
            // Due today and not before the reservation existed (as messages_tick).
            return Boolean(
              at && localDay(at) === today && at.getTime() >= Date.parse(r.created_at),
            );
          })();
    if (!due) return [];
    const text = fillMessageText(override?.body ?? tr(rule.body, r.locale), {
      guestName: r.guest_name,
      checkIn,
      checkOut,
      signature: settings?.contact_name?.trim() || r.tenant?.name || "",
      reviewLink: host ? `https://${host}/ucet/pobyt/${r.id}/hodnotenie` : "",
    });
    return text.trim() ? [{ title: tr(rule.name, r.locale), text }] : [];
  });
}
