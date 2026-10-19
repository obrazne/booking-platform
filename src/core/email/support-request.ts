import "server-only";
import { platformBrand } from "@/core/admin/brand";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, esc } from "./layout";
import { isReservedRecipient, type OutgoingEmail } from "./send";

/**
 * "Nenašli ste odpoveď?" (Z67): the request to the support address (NEXT_PUBLIC_SUPPORT_EMAIL), Reply-To = the person,
 * with the client, the page and the picture attached. No address set = nothing to send (the request waits in the
 * control center anyway); neither for test accounts.
 */
export async function supportRequestMail(requestId: string): Promise<OutgoingEmail | null> {
  const to = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!to) return null;
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("support_requests")
    .select("id, message, page, user_email, user_name, user_agent, attachment_path, tenants(name)")
    .eq("id", requestId)
    .maybeSingle();
  // Requests of test accounts (browser tests, @booking-platform.test) are not e-mailed — as test reservations.
  if (!r || (r.user_email && isReservedRecipient(r.user_email))) return null;
  const tenant = r.tenants?.name ?? "—";
  const who = [r.user_name, r.user_email].filter(Boolean).join(" · ") || "—";
  let attachments: OutgoingEmail["attachments"];
  if (r.attachment_path) {
    const { data: file } = await admin.storage
      .from("support-attachments")
      .download(r.attachment_path);
    if (file) {
      const ext = r.attachment_path.split(".").pop();
      attachments = [
        {
          filename: `obrazok.${ext}`,
          content: Buffer.from(await file.arrayBuffer()).toString("base64"),
        },
      ];
    }
  }
  const link = `${process.env.APP_URL ?? ""}/platform/support`;
  const firstLine = r.message.split("\n")[0]!.slice(0, 60);
  const rows: [string, string][] = [
    ["Klient", tenant],
    ["Kto", who],
    ["Stránka", r.page ?? "—"],
    ["Prehliadač", r.user_agent ?? "—"],
  ];
  const html = emailLayout(
    "#2f5d50",
    `Žiadosť o pomoc — ${tenant}`,
    [
      `<p style="white-space:pre-wrap;font-size:15px;line-height:1.6;margin:0 0 20px">${esc(r.message)}</p>`,
      `<table role="presentation" style="font-size:13px;color:#5a6672;border-collapse:collapse">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:2px 12px 2px 0">${esc(k)}</td><td style="padding:2px 0;color:#1d1d1b">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`,
      attachments ? `<p style="font-size:13px;color:#5a6672">Obrázok je v prílohe.</p>` : "",
    ],
    { href: link, label: "Otvoriť v riadiacom centre" },
  );
  const text = [
    `Žiadosť o pomoc — ${tenant}`,
    "",
    r.message,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    link,
  ].join("\n");
  return {
    to,
    subject: `Žiadosť o pomoc — ${tenant}: ${firstLine}`,
    html,
    text,
    replyTo: r.user_email,
    fromName: platformBrand.name,
    attachments,
  };
}
