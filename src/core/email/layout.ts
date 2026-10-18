/**
 * HTML of the e-mails (A7, A12; Z60): a minimal, client-safe layout in the tenant's accent colour. E-mails to guests
 * get a header (the client's logo, else the name of the accommodation) and a footer (contact and "Môj pobyt") — the
 * body stays a plain personal letter. Pure functions: the e-mail worker and the preview in the administration use them.
 */

export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** A paragraph; new lines stay. */
export const paragraph = (text: string) =>
  `<p style="margin:0 0 14px;line-height:1.6">${esc(text).replace(/\n/g, "<br>")}</p>`;

export type EmailFrame = { header: string; footer: string };

export type GuestFrameInput = {
  accent: string;
  /** Name of the accommodation (or the client) — the header without a logo. */
  name: string;
  /** Public https URL of the client's logo (theme), if any. */
  logoUrl?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  /** The guest's stay (access link or account). */
  stayLink?: string | null;
  labels: { questions: string; myStay: string; whatsapp: string };
};

/** Header and footer of every e-mail to a guest (Z60). */
export function guestFrame(f: GuestFrameInput): EmailFrame {
  const header =
    f.logoUrl && /^https:\/\//.test(f.logoUrl)
      ? `<img src="${esc(f.logoUrl)}" alt="${esc(f.name)}" height="40" style="height:40px;max-width:220px;display:block;border:0">`
      : `<p style="margin:0;font-size:17px;font-weight:700;color:${esc(f.accent)}">${esc(f.name)}</p>`;
  const contacts = [
    f.phone
      ? `<a href="tel:${esc(f.phone.replace(/\s/g, ""))}" style="color:#1d1d1b;text-decoration:none">${esc(f.phone)}</a>`
      : "",
    f.email
      ? `<a href="mailto:${esc(f.email)}" style="color:#1d1d1b;text-decoration:none">${esc(f.email)}</a>`
      : "",
    f.whatsapp
      ? `<a href="https://wa.me/${esc(f.whatsapp.replace(/\D/g, ""))}" style="color:#1d1d1b;text-decoration:none">${esc(f.labels.whatsapp)}</a>`
      : "",
  ].filter(Boolean);
  const footer = [
    contacts.length || f.contactName
      ? `<p style="margin:0 0 6px;color:#6e6e73">${esc(f.labels.questions)}${f.contactName ? ` ${esc(f.contactName)}` : ""}</p><p style="margin:0 0 12px">${contacts.join(" · ")}</p>`
      : "",
    f.stayLink
      ? `<p style="margin:0"><a href="${esc(f.stayLink)}" style="color:${esc(f.accent)};font-weight:600">${esc(f.labels.myStay)} →</a></p>`
      : "",
  ].join("");
  return { header, footer };
}

/** The whole e-mail; `frame` only for e-mails to guests. */
export function emailLayout(
  accent: string,
  title: string,
  blocks: string[],
  button?: { href: string; label: string },
  frame?: EmailFrame,
): string {
  const btn = button
    ? `<p style="margin:28px 0"><a href="${esc(button.href)}" style="background:${accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:500">${esc(button.label)}</a></p>`
    : "";
  const head = frame?.header
    ? `<tr><td style="padding:24px 32px;border-bottom:1px solid #e9e5db">${frame.header}</td></tr>`
    : "";
  const foot = frame?.footer
    ? `<tr><td style="padding:20px 32px;border-top:1px solid #e9e5db;font-size:14px;line-height:1.5">${frame.footer}</td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:Roboto,Helvetica,Arial,sans-serif;color:#1d1d1b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e9e5db;border-radius:24px" cellpadding="0" cellspacing="0">${head}<tr><td style="padding:32px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 20px">${esc(title)}</h1>
${blocks.join("\n")}
${btn}
</td></tr>${foot}</table></td></tr></table></body></html>`;
}

/** Plain text of the footer (text part of the e-mail). */
export function guestFrameText(f: GuestFrameInput): string {
  const lines = [
    [f.labels.questions, f.contactName].filter(Boolean).join(" "),
    [f.phone, f.email, f.whatsapp ? `${f.labels.whatsapp}: ${f.whatsapp}` : null]
      .filter(Boolean)
      .join(" · "),
    f.stayLink ? `${f.labels.myStay}: ${f.stayLink}` : "",
  ].filter((l) => l.trim());
  return lines.length ? `\n\n—\n${lines.join("\n")}` : "";
}

/** Where the text of the message goes in a preview template (filled in the browser while typing). */
export const BODY_MARKER = "\u0000message\u0000";

/** E-mail with messages for the guest (module messages, Z45/Z60) — the worker, the preview and the test e-mail. */
export function guestMessageHtml(o: {
  accent: string;
  frame?: EmailFrame;
  title: string;
  greeting: string;
  /** Texts of the messages (or BODY_MARKER in a preview template). */
  bodies: string[];
  replyHint: string;
  button: { href: string; label: string };
}): string {
  const bubbles = o.bodies.map(
    (b) =>
      `<div style="margin:0 0 12px;padding:12px 16px;border-radius:12px;background:#f3f4f2">${b === BODY_MARKER ? b : paragraph(b)}</div>`,
  );
  return emailLayout(
    o.accent,
    o.title,
    [paragraph(o.greeting), ...bubbles, paragraph(o.replyHint)],
    o.button,
    o.frame,
  );
}

/** A preview template with the text of the message filled in. */
export function fillMessagePreview(template: string, text: string): string {
  return template.replace(BODY_MARKER, paragraph(text));
}
