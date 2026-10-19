import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { PageHeader } from "@/core/admin/page-header";
import { tr } from "@/core/i18n/localized";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { AutoMessages, type AutoRule } from "@/modules/messages/admin/auto";
import { ruleEmailTemplate } from "@/modules/messages/admin/email-preview";
import { ensureMessageDefaults } from "@/modules/messages/defaults";
import { messageSignature, type MessageAnchor } from "@/modules/messages/rules";

/** ISO date `days` from today. */
function inDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Správy › Automatické správy (Z46): the rules of the client on a timeline of the stay and the quick replies. Only
 * with the module `messages` on; the default rules are added the first time (also for a module switched on in the
 * database).
 */
export default async function AutoMessagesPage() {
  const active = await requireTenant();
  if (!(await isModuleEnabled(active.tenantId, "messages"))) notFound();
  await ensureMessageDefaults(active.tenantId);
  const supabase = await createClient();
  const [
    t,
    tn,
    locale,
    tenant,
    upsellOn,
    reviewsOn,
    { data: rules },
    { data: quick },
    { data: settings },
  ] = await Promise.all([
    getTranslations("modules.messages.admin"),
    getTranslations("modules.messages"),
    getLocale(),
    getTenantInfo(active.tenantId),
    isModuleEnabled(active.tenantId, "upsell"),
    isModuleEnabled(active.tenantId, "reviews"),
    supabase
      .from("message_rules")
      .select("id, name, body, anchor, offset_days, send_time, enabled")
      .eq("tenant_id", active.tenantId)
      .order("sort"),
    supabase
      .from("quick_replies")
      .select("id, title, body")
      .eq("tenant_id", active.tenantId)
      .order("sort"),
    supabase
      .from("tenant_settings")
      .select("arrival_email_days_before, upsell_offer_days, contact_name, message_signature")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
  ]);

  const list: AutoRule[] = (rules ?? []).map((r) => ({
    id: r.id,
    name: tr(r.name, locale),
    body: tr(r.body, locale),
    anchor: r.anchor as MessageAnchor,
    offsetDays: r.offset_days,
    sendTime: r.send_time,
    enabled: r.enabled,
  }));

  const sample = {
    signature: messageSignature(settings, tenant.name),
    checkIn: inDays(14),
    checkOut: inDays(17),
    reviewLink: "https://…/hodnotenie",
  };
  // The e-mail as the guest gets it (Z60): the preview fills in the text while typing.
  const email = await ruleEmailTemplate(active.tenantId, {
    guestName: t("auto.sampleGuest"),
    checkIn: sample.checkIn,
    checkOut: sample.checkOut,
  });

  return (
    <div data-bleed>
      <PageHeader
        help="autoMessages"
        breadcrumbs={[{ label: tn("nav"), href: "/admin/messages" }, { label: tn("navAuto") }]}
        title={t("auto.title")}
      />
      <div className="grid max-w-4xl gap-8 px-5 pb-14 md:px-10">
        <AutoMessages
          locale={locale}
          rules={list}
          quickReplies={quick ?? []}
          arrivalDays={settings?.arrival_email_days_before ?? 3}
          upsellDays={upsellOn ? (settings?.upsell_offer_days ?? []) : []}
          reviewsOn={reviewsOn}
          sample={sample}
          emailTemplate={email.html}
        />
      </div>
    </div>
  );
}
