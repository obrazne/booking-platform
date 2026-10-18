import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { BODY_MARKER, guestFrame, guestMessageHtml } from "@/core/email/layout";
import { formatDate } from "@/core/format/format";
import { diffDays } from "@/core/pricing/dates";
import { getGuestSiteUrl, getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

/**
 * The e-mail of an automatic message as the guest gets it (Z60): the client's header and footer, the greeting and the
 * reply button — with BODY_MARKER where the text goes (the editor fills it while typing; the test e-mail too).
 * A sample guest and stay (the editor's preview).
 */
export async function ruleEmailTemplate(
  tenantId: string,
  sample: { guestName: string; checkIn: string; checkOut: string },
): Promise<{ subject: string; html: string }> {
  const supabase = await createClient();
  const [t, locale, tenant, site, { data: settings }, { data: theme }, { data: property }] =
    await Promise.all([
      getTranslations("emails"),
      getLocale(),
      getTenantInfo(tenantId),
      getGuestSiteUrl(tenantId),
      supabase
        .from("tenant_settings")
        .select("contact_name, contact_phone, whatsapp_phone")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("tenant_themes")
        .select("primary_color, logo_path")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("properties")
        .select("name, contact_email")
        .eq("tenant_id", tenantId)
        .order("sort")
        .limit(1)
        .maybeSingle(),
    ]);
  const accent = theme?.primary_color ?? "#2f5d50";
  const name = property?.name ?? tenant.name;
  const owner = settings?.contact_name?.trim() || tenant.name;
  const stay = `${formatDate(sample.checkIn, locale)} – ${formatDate(sample.checkOut, locale)} (${diffDays(sample.checkIn, sample.checkOut)})`;
  const mv = { owner, stay, number: "", property: name, guest: sample.guestName };
  const stayLink = site ? `${site}/ucet` : null;
  const frame = guestFrame({
    accent,
    name,
    logoUrl: theme?.logo_path && /^https:\/\//.test(theme.logo_path) ? theme.logo_path : null,
    contactName: settings?.contact_name?.trim() || null,
    phone: settings?.contact_phone ?? null,
    email: property?.contact_email ?? null,
    whatsapp: settings?.whatsapp_phone ?? null,
    stayLink,
    labels: {
      questions: t("frame.questions"),
      myStay: t("frame.myStay"),
      whatsapp: t("frame.whatsapp"),
    },
  });
  const subject = t("guest_message.subject", mv);
  return {
    subject,
    html: guestMessageHtml({
      accent,
      frame,
      title: subject,
      greeting: t("guest_message.greeting", {
        ...mv,
        name: sample.guestName.trim().split(/\s+/)[0] ?? "",
      }),
      bodies: [BODY_MARKER],
      replyHint: t("guest_message.replyHint", mv),
      button: { href: stayLink ?? "#", label: t("guest_message.button", mv) },
    }),
  };
}
