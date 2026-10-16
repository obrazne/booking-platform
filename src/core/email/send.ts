import "server-only";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  fromName?: string;
  attachments?: { filename: string; content: string; contentId?: string }[];
};

/**
 * Sends through Resend (A7). Staging: EMAIL_REDIRECT_TO sends everything to one inbox (the original recipient is
 * named in the subject). The sender domain is the service's test domain until the client's own domain is verified.
 */
export async function sendEmail(
  mail: OutgoingEmail,
): Promise<{ ok: true; id: string; to: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  const redirect = process.env.EMAIL_REDIRECT_TO;
  const to = redirect || mail.to;
  const from =
    process.env.EMAIL_FROM ??
    `${(mail.fromName ?? "Booking").replace(/[<>"]/g, "")} <onboarding@resend.dev>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: redirect ? `[→ ${mail.to}] ${mail.subject}` : mail.subject,
      html: mail.html,
      text: mail.text,
      reply_to: mail.replyTo || undefined,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        content_id: a.contentId,
      })),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !body.id)
    return { ok: false, error: `${res.status} ${body.message ?? ""}`.trim() };
  return { ok: true, id: body.id, to };
}
