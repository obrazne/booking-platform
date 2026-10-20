import "server-only";
import { createTranslator } from "next-intl";
import messagesSk from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleCalendarUrl, outlookCalendarUrl, type StayEvent } from "./calendar-links";

const MESSAGES = { sk: messagesSk } as const;

/**
 * The stay as a calendar event (Z72) — for the access link, the stay in the account and the confirmation e-mail.
 * Read with the server key only after the caller matched the reservation (token, signed-in guest, e-mail worker).
 * The exact address only when the owner shows the place (as the confirmation page); never codes or the Wi-Fi.
 */
export async function stayEvent(
  reservationId: string,
  link: string,
  locale = "sk",
): Promise<StayEvent | null> {
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select(
      "number, tenant:tenants!inner(timezone), property:properties!inner(name, check_in_from, check_out_until, location_mode, street, postal_code, city), items:reservation_items(check_in, check_out)",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (!r?.items?.length) return null;
  const items = [...r.items].sort((a, b) => a.check_in.localeCompare(b.check_in));
  const p = r.property;
  const exact = p.location_mode === "exact";
  const lang = (locale in MESSAGES ? locale : "sk") as keyof typeof MESSAGES;
  const t = createTranslator({
    locale: lang,
    messages: MESSAGES[lang],
    namespace: "guest.confirm",
  });
  return {
    title: t("calendarTitle", { property: p.name }),
    description: t("calendarDescription", { number: r.number }),
    location: exact
      ? [p.street, [p.postal_code, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") ||
        null
      : (p.city ?? null),
    link,
    checkIn: items[0]!.check_in,
    checkOut: items.at(-1)!.check_out,
    checkInFrom: p.check_in_from?.slice(0, 5) ?? null,
    checkOutUntil: p.check_out_until?.slice(0, 5) ?? null,
    timeZone: r.tenant.timezone || "Europe/Bratislava",
  };
}

/** The three ways for the menu and the e-mail: Google, Outlook (links) and the .ics file. */
export function calendarLinks(e: StayEvent, icsHref: string) {
  return { google: googleCalendarUrl(e), outlook: outlookCalendarUrl(e), ics: icsHref };
}
