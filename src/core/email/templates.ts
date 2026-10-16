import "server-only";
import { createTranslator } from "next-intl";
import QRCode from "qrcode";
import { CurrencyCode, encode, PaymentOptions } from "bysquare/pay";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import messagesSk from "@/i18n/messages/sk.json";
import type { EmailContext } from "./context";
import type { OutgoingEmail } from "./send";

const MESSAGES = { sk: messagesSk } as const;
export type EmailKind =
  | "guest_received"
  | "guest_reminder"
  | "guest_confirmed"
  | "guest_cancelled"
  | "guest_arrival"
  | "owner_new"
  | "owner_expired"
  | "owner_cancel_request";

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Minimal, client-safe HTML layout in the tenant's accent colour (A7, A12). */
function layout(
  accent: string,
  title: string,
  blocks: string[],
  button?: { href: string; label: string },
) {
  const btn = button
    ? `<p style="margin:28px 0"><a href="${esc(button.href)}" style="background:${accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:500">${esc(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:Roboto,Helvetica,Arial,sans-serif;color:#1d1d1b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e9e5db;border-radius:24px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 20px">${esc(title)}</h1>
${blocks.join("\n")}
${btn}
</td></tr></table></td></tr></table></body></html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 14px;line-height:1.6">${esc(text).replace(/\n/g, "<br>")}</p>`;
const rows = (pairs: [string, string][]) =>
  `<table role="presentation" width="100%" style="margin:8px 0 18px;border-top:1px solid #e9e5db" cellpadding="0" cellspacing="0">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e9e5db;color:#6e6e73">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e9e5db;text-align:right">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;

/** Renders the message for an outbox row. Returns null when it cannot be sent (missing recipient). */
export async function renderEmail(
  kind: EmailKind,
  ctx: EmailContext,
  payload: Record<string, unknown>,
): Promise<OutgoingEmail | null> {
  const { r, settings, accent } = ctx;
  const locale = (r.locale in MESSAGES ? r.locale : "sk") as keyof typeof MESSAGES;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails" });
  const tz = r.tenant?.timezone ?? "Europe/Bratislava";
  const item = r.items[0];
  const property = r.property;
  const tenantName = r.tenant?.name ?? "";
  const fmt = (c: number) => formatMoney(money(c, r.currency), locale);
  const stay = item
    ? `${formatDate(item.check_in, locale)} – ${formatDate(item.check_out, locale)} (${diffDays(item.check_in, item.check_out)})`
    : "";
  const vars = { number: r.number, property: property?.name ?? "", guest: r.guest_name };
  const due = r.payment_due_at ? formatDateTime(r.payment_due_at, locale, tz) : "";
  const summary = rows([
    [t("number"), r.number],
    [t("stay"), `${property?.name ?? ""}, ${stay}`],
    [t("guests"), String(r.adults + r.children + r.infants)],
    ...[...r.lines]
      .sort((a, b) => a.sort - b.sort)
      .map((l) => [l.label, fmt(l.amount_cents)] as [string, string]),
    [t("total"), fmt(r.total_cents)],
  ]);
  const signature = p(t("signature", { tenant: tenantName }));
  const guestButton = ctx.guestLink
    ? { href: ctx.guestLink, label: t("openReservation") }
    : undefined;
  const ownerTo = settings?.owner_notification_email ?? property?.contact_email ?? null;

  async function paymentBlock() {
    const vs = r.payments[0]?.variable_symbol ?? r.number.replace("-", "");
    const blocks = [
      `<h2 style="font-size:16px;margin:24px 0 4px">${esc(t("payment.title"))}</h2>`,
      rows([
        [t("payment.amount"), fmt(r.total_cents)],
        [t("payment.iban"), (settings?.iban ?? "").replace(/(.{4})/g, "$1 ").trim()],
        [t("payment.holder"), settings?.account_holder ?? tenantName],
        [t("payment.vs"), vs],
        [t("payment.due"), due],
      ]),
    ];
    const attachments: OutgoingEmail["attachments"] = [];
    if (settings?.iban && (r.currency === "EUR" || r.currency === "CZK")) {
      const qr = encode({
        payments: [
          {
            type: PaymentOptions.PaymentOrder,
            amount: r.total_cents / 100,
            currencyCode: r.currency === "EUR" ? CurrencyCode.EUR : CurrencyCode.CZK,
            variableSymbol: vs,
            paymentNote: `${property?.name ?? ""} ${r.number}`.slice(0, 140),
            beneficiary: { name: (settings.account_holder ?? tenantName).slice(0, 70) },
            bankAccounts: [{ iban: settings.iban }],
          },
        ],
      });
      const png = await QRCode.toBuffer(qr, { margin: 1, width: 360 });
      attachments.push({
        filename: "platba-qr.png",
        content: png.toString("base64"),
        contentId: "payqr",
      });
      blocks.push(
        `<p style="margin:0"><img src="cid:payqr" width="180" height="180" alt="PAY by square"></p>`,
      );
      blocks.push(p(t("payment.qr")));
    }
    return { blocks, attachments };
  }

  switch (kind) {
    case "guest_received": {
      const pay = await paymentBlock();
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_received.subject", vars),
        html: layout(
          accent,
          t("guest_received.subject", vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(t("guest_received.intro", { due })),
            summary,
            ...pay.blocks,
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_received.intro", { due }),
          ctx.guestLink ?? "",
        ].join("\n\n"),
        attachments: pay.attachments,
      };
    }
    case "guest_reminder": {
      const pay = await paymentBlock();
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_reminder.subject", vars),
        html: layout(
          accent,
          t("guest_reminder.subject", vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(t("guest_reminder.intro", { due })),
            ...pay.blocks,
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_reminder.intro", { due }),
          ctx.guestLink ?? "",
        ].join("\n\n"),
        attachments: pay.attachments,
      };
    }
    case "guest_confirmed":
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_confirmed.subject", vars),
        html: layout(
          accent,
          t("guest_confirmed.subject", vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(t("guest_confirmed.intro")),
            summary,
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_confirmed.intro"),
          ctx.guestLink ?? "",
        ].join("\n\n"),
      };
    case "guest_cancelled": {
      const reason = typeof payload.reason === "string" ? payload.reason : null;
      const extra =
        reason === "payment_deadline_expired"
          ? t("guest_cancelled.expired")
          : reason
            ? t("guest_cancelled.reason", { reason })
            : "";
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_cancelled.subject", vars),
        html: layout(accent, t("guest_cancelled.subject", vars), [
          p(t("greeting", { name: r.guest_name })),
          p(t("guest_cancelled.intro")),
          extra ? p(extra) : "",
          signature,
        ]),
        text: [t("greeting", { name: r.guest_name }), t("guest_cancelled.intro"), extra].join(
          "\n\n",
        ),
      };
    }
    case "guest_arrival": {
      // Access codes and Wi-Fi live only here, never on a public page (B6).
      const instructions = tr(property?.private?.arrival_instructions ?? {}, locale);
      const address = [property?.street, property?.postal_code, property?.city]
        .filter(Boolean)
        .join(", ");
      const times = t("guest_arrival.checkIn", {
        time: property?.check_in_from?.slice(0, 5) ?? "",
        time2: property?.check_out_until?.slice(0, 5) ?? "",
      });
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_arrival.subject", vars),
        html: layout(
          accent,
          t("guest_arrival.subject", vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(t("guest_arrival.intro")),
            p(times),
            address ? p(t("guest_arrival.address", { address })) : "",
            instructions ? p(instructions) : "",
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_arrival.intro"),
          times,
          instructions,
        ].join("\n\n"),
      };
    }
    case "owner_new":
    case "owner_expired":
    case "owner_cancel_request": {
      if (!ownerTo) return null;
      const intro =
        kind === "owner_cancel_request"
          ? [
              t("owner_cancel_request.intro", vars),
              payload.note ? t("owner_cancel_request.note", { note: String(payload.note) }) : "",
              t("owner_cancel_request.decide"),
            ]
          : [t(`${kind}.intro`, vars)];
      return {
        to: ownerTo,
        subject: t(`${kind}.subject`, vars),
        html: layout(
          accent,
          t(`${kind}.subject`, vars),
          [p(t("ownerGreeting")), ...intro.filter(Boolean).map(p), summary],
          {
            href: ctx.adminLink,
            label: t("openAdmin"),
          },
        ),
        text: [t("ownerGreeting"), ...intro, ctx.adminLink].join("\n\n"),
      };
    }
  }
}
