import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createTranslator } from "next-intl";
import messagesSk from "@/i18n/messages/sk.json";
import { tenantPublicHost } from "@/core/booking/reservation-view";
import { getTenantTheme } from "@/core/theme/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, esc, guestFrame, guestFrameText } from "./layout";
import type { OutgoingEmail } from "./send";

/**
 * Request for the consent with offers (Z68): the owner asked, the guest gets a button. The one-time token is made
 * here — only its hash is stored — and the link leads to a page where the guest confirms with a click (opening the
 * link alone changes nothing; e-mail scanners open links). No public address of the client = nothing to send.
 */
export async function consentRequestMail(requestId: string): Promise<OutgoingEmail | null> {
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("guest_consent_requests")
    .select(
      "id, tenant_id, token_hash, confirmed_at, guest:guests!inner(email, name), tenant:tenants!inner(name)",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.token_hash || req.confirmed_at) return null;
  const host = await tenantPublicHost(req.tenant_id);
  if (!host) return null;
  const token = randomBytes(24).toString("hex");
  const { data: stored } = await admin.rpc("guest_consent_request_token", {
    p_request_id: req.id,
    p_token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (!stored) return null;
  const [theme, { data: settings }] = await Promise.all([
    getTenantTheme(req.tenant_id),
    admin
      .from("tenant_settings")
      .select("contact_name, contact_phone, whatsapp_phone")
      .eq("tenant_id", req.tenant_id)
      .maybeSingle(),
  ]);
  return renderConsentRequest({
    tenant: req.tenant.name,
    accent: theme.primaryColor,
    to: req.guest.email,
    firstName: req.guest.name?.split(" ")[0] ?? null,
    link: `https://${host}/suhlas/${token}`,
    contact: settings,
  });
}

/** The e-mail itself (pure, for the test). */
export function renderConsentRequest(o: {
  tenant: string;
  accent: string;
  to: string;
  firstName: string | null;
  link: string;
  contact?: {
    contact_name: string | null;
    contact_phone: string | null;
    whatsapp_phone: string | null;
  } | null;
}): OutgoingEmail {
  const t = createTranslator({ locale: "sk", messages: messagesSk, namespace: "guests.email" });
  const tf = createTranslator({ locale: "sk", messages: messagesSk, namespace: "emails.frame" });
  const frame = {
    accent: o.accent,
    name: o.tenant,
    contactName: o.contact?.contact_name ?? null,
    phone: o.contact?.contact_phone ?? null,
    whatsapp: o.contact?.whatsapp_phone ?? null,
    labels: { questions: tf("questions"), myStay: tf("myStay"), whatsapp: tf("whatsapp") },
  };
  const body = t("body", { name: o.firstName ? `, ${o.firstName}` : "" });
  const html = emailLayout(
    o.accent,
    t("title"),
    [
      `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${esc(body)}</p>`,
      `<p style="font-size:13px;line-height:1.5;color:#5a6672;margin:0">${esc(t("ignore"))}</p>`,
    ],
    { href: o.link, label: t("button") },
    guestFrame(frame),
  );
  const text = [t("title"), "", body, "", `${t("button")}: ${o.link}`, "", t("ignore")].join("\n");
  return {
    to: o.to,
    subject: t("subject", { tenant: o.tenant }),
    html,
    text: `${text}${guestFrameText(frame)}`,
    fromName: o.tenant,
  };
}
