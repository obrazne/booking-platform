import "server-only";
import { cache } from "react";
import { createTranslator } from "next-intl";
import { z } from "zod";
import { tr } from "@/core/i18n/localized";
import messagesSk from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const view = z.object({
  enabled: z.boolean(),
  open_until: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  team_read_at: z.string().nullable(),
  guest_read_at: z.string().nullable(),
  messages: z.array(
    z.object({ id: z.string(), mine: z.boolean(), body: z.string(), created_at: z.string() }),
  ),
  topics: z.array(z.record(z.string(), z.string())).nullable(),
});

export type GuestMessage = { id: string; mine: boolean; body: string; createdAt: string };

/**
 * The guest's conversation of a stay (Z47) — account or access link (verified in the database): messages, read
 * states, whether the guest can still write (30 days after departure), the client's quick topics and contact.
 */
export const loadGuestMessages = cache(
  async (reservationId: string, locale: string, token?: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("guest_messages", {
      p_reservation_id: reservationId,
      p_token: token,
    });
    if (error || !data) return null;
    const parsed = view.safeParse(data);
    if (!parsed.success || !parsed.data.enabled) return null;
    const v = parsed.data;
    const admin = createAdminClient();
    const { data: r } = await admin
      .from("reservations")
      .select("tenant_id, items:reservation_items(check_in, check_out)")
      .eq("id", reservationId)
      .single();
    const [{ data: settings }, { data: tenant }] = await Promise.all([
      admin
        .from("tenant_settings")
        .select("contact_name, contact_phone, whatsapp_phone, owner_notification_email")
        .eq("tenant_id", r!.tenant_id)
        .maybeSingle(),
      admin.from("tenants").select("name, timezone").eq("id", r!.tenant_id).single(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const defaults = createTranslator({
      locale: "sk",
      messages: messagesSk,
      namespace: "modules.messages.guest.topics",
    });
    const topics = (
      v.topics?.length
        ? v.topics.map((x) => tr(x, locale))
        : [defaults("arrival"), defaults("late"), defaults("broken")]
    ).filter(Boolean);
    const messages: GuestMessage[] = v.messages.map((m) => ({
      id: m.id,
      mine: m.mine,
      body: m.body,
      createdAt: m.created_at,
    }));
    const unread = messages.filter(
      (m) => !m.mine && (!v.guest_read_at || m.createdAt > v.guest_read_at),
    ).length;
    const ownerName = settings?.contact_name?.trim() || tenant?.name || "";
    const checkIn = r?.items.map((i) => i.check_in).sort()[0] ?? "";
    const checkOut =
      r?.items
        .map((i) => i.check_out)
        .sort()
        .at(-1) ?? "";
    return {
      messages,
      unread,
      teamReadAt: v.team_read_at,
      guestReadAt: v.guest_read_at,
      confirmedAt: v.confirmed_at,
      closed: Boolean(v.open_until && today > v.open_until),
      checkIn,
      checkOut,
      topics,
      timeZone: tenant?.timezone ?? "Europe/Bratislava",
      owner: {
        name: ownerName,
        first: ownerName.split(/\s+/)[0] ?? ownerName,
        phone: settings?.contact_phone ?? settings?.whatsapp_phone ?? null,
        email: settings?.owner_notification_email ?? null,
      },
    };
  },
);

export type GuestMessages = NonNullable<Awaited<ReturnType<typeof loadGuestMessages>>>;

/** Where the conversation is on its own (phones, e-mail link): in the account or behind the access link. */
export function messagesHref(reservationId: string, token?: string) {
  return token ? `/r/${token}/spravy` : `/ucet/pobyt/${reservationId}/spravy`;
}
