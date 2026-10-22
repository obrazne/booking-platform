import "server-only";
import { createTranslator } from "next-intl";
import messagesSk from "@/i18n/messages/sk.json";
import { tenantPublicHost } from "@/core/booking/reservation-view";
import { emailLayout, esc, guestFrame, guestFrameText, paragraph } from "@/core/email/layout";
import type { OutgoingEmail } from "@/core/email/send";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { giftVoucherPdf } from "./pdf";

const t = createTranslator({ locale: "sk", messages: messagesSk, namespace: "giftVouchers.doc" });
const tf = createTranslator({ locale: "sk", messages: messagesSk, namespace: "emails.frame" });

/**
 * A gift voucher of the signed-in team (RLS) as the PDF in the client's design and the e-mail with it (Z78). The site
 * printed on it is the client's own public address; the logo only when it is a public https image.
 */
export async function giftVoucherDocument(tenantId: string, id: string) {
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("gift_vouchers")
    .select("id, code, amount_cents, currency, recipient_name, valid_until, status")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (!v) return null;
  const admin = createAdminClient();
  const [host, { data: tenant }, { data: theme }, { data: settings }] = await Promise.all([
    tenantPublicHost(tenantId),
    admin.from("tenants").select("name").eq("id", tenantId).single(),
    admin
      .from("tenant_themes")
      .select("primary_color, logo_path")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin
      .from("tenant_settings")
      .select("contact_name, contact_phone, whatsapp_phone")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);
  const tenantName = tenant?.name ?? "";
  const accent = theme?.primary_color ?? "#2f5d50";
  const logoUrl = theme?.logo_path && /^https:\/\//.test(theme.logo_path) ? theme.logo_path : null;
  const amount = formatMoney(money(v.amount_cents, v.currency), "sk");
  const validUntil = v.valid_until ? formatDate(v.valid_until, "sk") : null;
  const pdf = await giftVoucherPdf({
    tenantName,
    accent,
    logoUrl,
    recipient: v.recipient_name,
    amount,
    code: v.code,
    validUntil,
    site: host,
    labels: {
      kicker: t("kicker"),
      forName: (name) => t("forName", { name }),
      code: t("code"),
      validUntil: (date) => t("validUntil", { date }),
      noExpiry: t("noExpiry"),
      useAt: (site) => t("useAt", { site }),
      useHow: t("useHow"),
    },
  });
  const filename = `poukaz-${v.code}.pdf`;

  /** The e-mail to the recipient with the PDF attached (branded like the e-mails to guests). */
  const email = (to: string): OutgoingEmail => {
    const frame = {
      accent,
      name: tenantName,
      logoUrl,
      contactName: settings?.contact_name?.trim() || null,
      phone: settings?.contact_phone ?? null,
      email: null,
      whatsapp: settings?.whatsapp_phone ?? null,
      stayLink: null,
      labels: { questions: tf("questions"), myStay: "", whatsapp: tf("whatsapp") },
    };
    const subject = t("emailSubject", { tenant: tenantName, amount });
    const lines = [
      v.recipient_name ? t("emailGreeting", { name: v.recipient_name }) : t("emailGreetingNoName"),
      t("emailText", { tenant: tenantName, amount }),
      t("emailCode", { code: v.code }),
      validUntil ? t("validUntil", { date: validUntil }) : t("noExpiry"),
      t("useHow"),
    ];
    return {
      to,
      subject,
      fromName: tenantName,
      html: emailLayout(
        accent,
        subject,
        [
          paragraph(lines[0]!),
          paragraph(lines[1]!),
          `<p style="margin:0 0 16px;font-size:22px;letter-spacing:.06em;font-weight:700">${esc(v.code)}</p>`,
          paragraph(lines[3]!),
          paragraph(lines[4]!),
        ],
        host ? { href: `https://${host}`, label: t("emailButton") } : undefined,
        guestFrame(frame),
      ),
      text: `${[...lines, host ? `https://${host}` : ""].filter(Boolean).join("\n\n")}${guestFrameText(frame)}`,
      attachments: [{ filename, content: Buffer.from(pdf).toString("base64") }],
    };
  };
  return { voucher: v, pdf, filename, email };
}
