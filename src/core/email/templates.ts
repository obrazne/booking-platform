import "server-only";
import { createTranslator } from "next-intl";
import QRCode from "qrcode";
import { CurrencyCode, encode, PaymentOptions } from "bysquare/pay";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { moduleEmailBlocks } from "@/core/modules/registry";
import { modelQuantity } from "@/core/pricing/calculate";
import { diffDays } from "@/core/pricing/dates";
import type { PriceModel } from "@/core/pricing/types";
import messagesSk from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
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
  | "owner_cancel_request"
  | "guest_review_invite"
  | "guest_review_reminder"
  | "guest_review_rejected"
  | "guest_order_received"
  | "guest_order_confirmed"
  | "guest_order_declined"
  | "guest_checkin_reminder"
  | "guest_upsell_offer"
  | "guest_message"
  | "owner_message";

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
  // Blocks modules add to the guest's e-mail (e.g. an automatic message — no double e-mails, Z45).
  const moduleBlocks =
    kind === "guest_confirmed" || kind === "guest_arrival" || kind === "guest_upsell_offer"
      ? await moduleEmailBlocks({ kind, tenantId: r.tenant_id, reservationId: r.id, locale })
      : [];
  const blocksHtml = moduleBlocks.map(
    (b) =>
      `<div style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${accent};background:#fafaf8">${b.title ? `<p style="margin:0 0 6px;font-weight:700">${esc(b.title)}</p>` : ""}${p(b.text)}</div>`,
  );
  const blocksText = moduleBlocks.map((b) => [b.title, b.text].filter(Boolean).join("\n"));

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
            ...blocksHtml,
            summary,
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_confirmed.intro"),
          ...blocksText,
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
      // Door code and Wi-Fi of the property (Z44, private) — only here and on the unlocked stay page.
      const codes = (
        [
          [t("guest_arrival.doorCode"), property?.private?.door_code],
          [t("guest_arrival.wifi"), property?.private?.wifi_name],
          [t("guest_arrival.wifiPassword"), property?.private?.wifi_password],
        ] as [string, string | null | undefined][]
      ).filter((x): x is [string, string] => Boolean(x[1]));
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
            codes.length ? rows(codes) : "",
            instructions ? p(instructions) : "",
            ...blocksHtml,
            signature,
          ],
          guestButton,
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          t("guest_arrival.intro"),
          times,
          ...codes.map(([k, v]) => `${k}: ${v}`),
          instructions,
          ...blocksText,
        ].join("\n\n"),
      };
    }
    case "guest_review_invite":
    case "guest_review_reminder": {
      const lastOut = [...r.items]
        .map((i) => i.check_out)
        .sort()
        .pop();
      const until = lastOut
        ? formatDate(
            new Date(Date.parse(`${lastOut}T00:00:00Z`) + 30 * 86_400_000)
              .toISOString()
              .slice(0, 10),
            locale,
          )
        : "";
      const intro = t(`${kind}.intro`);
      const windowLine = until ? t("guest_review_invite.window", { date: until }) : "";
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t(`${kind}.subject`, vars),
        html: layout(
          accent,
          t(`${kind}.subject`, vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(intro),
            windowLine ? p(windowLine) : "",
            signature,
          ],
          { href: ctx.reviewLink, label: t("guest_review_invite.button") },
        ),
        text: [t("greeting", { name: r.guest_name }), intro, windowLine, ctx.reviewLink].join(
          "\n\n",
        ),
      };
    }
    case "guest_review_rejected": {
      const key = typeof payload.reason === "string" ? payload.reason : "";
      const reasonKey = `reviewReasons.${key}`;
      const reason = t.has(reasonKey as never) ? t(reasonKey as never) : key;
      const lines = [
        t("guest_review_rejected.intro"),
        reason ? t("guest_review_rejected.reason", { reason }) : "",
        t("guest_review_rejected.contact"),
      ].filter(Boolean);
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_review_rejected.subject", vars),
        html: layout(accent, t("guest_review_rejected.subject", vars), [
          p(t("greeting", { name: r.guest_name })),
          ...lines.map(p),
          signature,
        ]),
        text: [t("greeting", { name: r.guest_name }), ...lines].join("\n\n"),
      };
    }
    case "guest_order_received":
    case "guest_order_confirmed":
    case "guest_order_declined": {
      const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
      const { data: order } = await createAdminClient()
        .from("reservation_orders")
        .select(
          "label, amount_cents, currency, service_date, payment_method, status, decline_reason, cutoff_at",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return null;
      const ov = { ...vars, service: order.label };
      const methodKey = `orderMethods.${order.payment_method}`;
      const line = t("guest_order_received.line", {
        service: order.label,
        date: order.service_date ? ` (${formatDate(order.service_date, locale)})` : "",
        amount: formatMoney(money(order.amount_cents, order.currency), locale),
        method: t.has(methodKey as never) ? t(methodKey as never) : order.payment_method,
      });
      const lines =
        kind === "guest_order_received"
          ? [
              order.status === "awaiting_confirmation"
                ? t("guest_order_received.awaiting")
                : t("guest_order_received.confirmed"),
              line,
              t("guest_order_received.cancelUntil", {
                date: formatDateTime(order.cutoff_at, locale, tz),
              }),
            ]
          : kind === "guest_order_confirmed"
            ? [t("guest_order_confirmed.intro"), line]
            : [
                t("guest_order_declined.intro"),
                line,
                order.decline_reason
                  ? t("guest_order_declined.reason", { reason: order.decline_reason })
                  : "",
              ].filter(Boolean);
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t(`${kind}.subject`, ov),
        html: layout(
          accent,
          t(`${kind}.subject`, ov),
          [p(t("greeting", { name: r.guest_name })), ...lines.map(p), signature],
          guestButton,
        ),
        text: [t("greeting", { name: r.guest_name }), ...lines, ctx.guestLink ?? ""].join("\n\n"),
      };
    }
    case "guest_upsell_offer": {
      // Services the guest can still order (Z37): active, offered after the reservation, of this property, before
      // the cutoff (a service for the days of the stay until the last night). Nothing left → nothing is sent.
      const { data: services } = await createAdminClient()
        .from("services")
        .select(
          "name, price_model, amount_cents, property_id, upsell_cutoff_hours, upsell_requires_confirmation",
        )
        .eq("tenant_id", r.tenant_id)
        .eq("active", true)
        .eq("upsell_enabled", true)
        .order("sort");
      if (!item) return null;
      const nights = diffDays(item.check_in, item.check_out);
      const persons = r.adults + r.children;
      const offers = (services ?? [])
        .filter((s) => !s.property_id || s.property_id === property?.id)
        .filter((s) => {
          const perDay = s.price_model === "per_night" || s.price_model === "per_person_night";
          const day = perDay ? item.check_out : item.check_in;
          const closes = Date.parse(`${day}T00:00:00Z`) - s.upsell_cutoff_hours * 3_600_000;
          // Midnight in UTC is at most 2 hours off the tenant's midnight — enough for an e-mail days ahead.
          return closes > Date.now();
        })
        .map((s) => {
          const model = s.price_model as PriceModel;
          const dated = model === "per_night" || model === "per_person_night";
          const price = fmt(s.amount_cents * modelQuantity(model, dated ? 1 : nights, persons, 1));
          return t("guest_upsell_offer.line", {
            service: tr(s.name, locale),
            price:
              dated || s.upsell_requires_confirmation
                ? t("guest_upsell_offer.from", { price })
                : price,
          });
        });
      if (!offers.length) return null;
      const intro = t("guest_upsell_offer.intro", { days: Number(payload.days ?? 0) });
      const outro = t("guest_upsell_offer.outro");
      const link = ctx.guestLink ?? ctx.stayLink;
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_upsell_offer.subject", vars),
        html: layout(
          accent,
          t("guest_upsell_offer.subject", vars),
          [
            p(t("greeting", { name: r.guest_name })),
            p(intro),
            `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.7">${offers.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`,
            p(outro),
            ...blocksHtml,
            signature,
          ],
          { href: link, label: t("guest_upsell_offer.button") },
        ),
        text: [
          t("greeting", { name: r.guest_name }),
          intro,
          ...offers,
          outro,
          ...blocksText,
          link,
        ].join("\n\n"),
      };
    }
    case "guest_message":
    case "owner_message": {
      // Messages (module messages, Z45): everything written since the first message of this e-mail (several
      // messages within 15 minutes = one e-mail). The owner's e-mail is not sent when the team has read it meanwhile.
      const since = typeof payload.since === "string" ? payload.since : new Date(0).toISOString();
      const admin = createAdminClient();
      const toGuest = kind === "guest_message";
      const [{ data: list }, { data: thread }] = await Promise.all([
        admin
          .from("messages")
          .select("sender, body, created_at, email_via")
          .eq("reservation_id", r.id)
          .gte("created_at", since)
          .order("created_at"),
        admin
          .from("message_threads")
          .select("team_read_at")
          .eq("reservation_id", r.id)
          .maybeSingle(),
      ]);
      const items = (list ?? []).filter((m) =>
        toGuest ? m.sender !== "guest" && !m.email_via : m.sender === "guest",
      );
      if (!items.length) return null;
      if (!toGuest && thread?.team_read_at && thread.team_read_at >= items.at(-1)!.created_at)
        return null;
      const owner = settings?.contact_name?.trim() || tenantName;
      const mv = { ...vars, owner, stay };
      const bubbles = items.map(
        (m) =>
          `<div style="margin:0 0 12px;padding:12px 16px;border-radius:12px;background:#f3f4f2">${p(m.body)}</div>`,
      );
      if (toGuest) {
        // Opens the conversation of the stay without a password (access link), or the stay in the account (Z47).
        const reply = ctx.guestLink ? `${ctx.guestLink}/spravy` : `${ctx.stayLink}#spravy`;
        return {
          to: r.guest_email,
          replyTo: ownerTo,
          fromName: `${owner} · ${property?.name ?? tenantName}`,
          subject: t("guest_message.subject", mv),
          html: layout(
            accent,
            t("guest_message.subject", mv),
            [
              p(t("guest_message.greeting", { ...mv, name: r.guest_name.split(/\s+/)[0] ?? "" })),
              ...bubbles,
              p(t("guest_message.replyHint", mv)),
            ],
            { href: reply, label: t("guest_message.button", mv) },
          ),
          text: [...items.map((m) => m.body), t("guest_message.replyHint", mv), reply].join("\n\n"),
        };
      }
      if (!ownerTo) return null;
      const link = `${ctx.adminLink}&tab=messages`;
      return {
        to: ownerTo,
        fromName: tenantName,
        subject: t("owner_message.subject", mv),
        html: layout(
          accent,
          t("owner_message.subject", mv),
          [p(t("owner_message.waiting", mv)), ...bubbles, p(t("owner_message.note"))],
          {
            href: link,
            label: t("owner_message.button"),
          },
        ),
        text: [...items.map((m) => m.body), link].join("\n\n"),
      };
    }
    case "guest_checkin_reminder": {
      const intro = t("guest_checkin_reminder.intro", { days: Number(payload.days ?? 0) });
      // Through the access link the guest needs no sign-in (Z39); the account works too.
      const checkinLink = ctx.guestLink ? `${ctx.guestLink}/checkin` : ctx.checkinLink;
      return {
        to: r.guest_email,
        replyTo: ownerTo,
        fromName: tenantName,
        subject: t("guest_checkin_reminder.subject", vars),
        html: layout(
          accent,
          t("guest_checkin_reminder.subject", vars),
          [p(t("greeting", { name: r.guest_name })), p(intro), signature],
          { href: checkinLink, label: t("guest_checkin_reminder.button") },
        ),
        text: [t("greeting", { name: r.guest_name }), intro, checkinLink].join("\n\n"),
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

/** Owner alert about an iCal collision (A16): nothing was overwritten, the owner decides. */
export async function renderIcalConflict(
  tenant: {
    name: string;
    ownerEmail: string | null;
    accent: string;
    locale: string;
    adminUrl: string;
  },
  payload: { channel?: string; conflicts?: { id?: string; start: string; end: string }[] },
): Promise<OutgoingEmail | null> {
  if (!tenant.ownerEmail) return null;
  // Z42: one collision → its panel; more → the list of collisions (adminUrl is the administration).
  const ids = (payload.conflicts ?? []).map((c) => c.id).filter(Boolean);
  const base = tenant.adminUrl.replace(/\/admin(\/.*)?$/, "");
  const link =
    ids.length === 1
      ? `${base}/admin/collisions?panel=collision:${ids[0]}`
      : `${base}/admin/collisions`;
  const locale = (tenant.locale in MESSAGES ? tenant.locale : "sk") as keyof typeof MESSAGES;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails" });
  const dates = (payload.conflicts ?? [])
    .map((c) => `${formatDate(c.start, locale)} – ${formatDate(c.end, locale)}`)
    .join(", ");
  const vars = { property: tenant.name, channel: payload.channel ?? "iCal", dates };
  return {
    to: tenant.ownerEmail,
    subject: t("owner_ical_conflict.subject", vars),
    html: layout(
      tenant.accent,
      t("owner_ical_conflict.subject", vars),
      [p(t("ownerGreeting")), p(t("owner_ical_conflict.intro", vars))],
      {
        href: link,
        label: t("owner_ical_conflict.button"),
      },
    ),
    text: [t("ownerGreeting"), t("owner_ical_conflict.intro", vars), link].join("\n\n"),
  };
}

/** One-time login code for the guest zone (B10), in the tenant's colour. Sent directly, never stored in the outbox. */
export function renderLoginCode(
  tenant: { name: string; accent: string; locale: string },
  to: string,
  code: string,
): OutgoingEmail {
  const locale = (tenant.locale in MESSAGES ? tenant.locale : "sk") as keyof typeof MESSAGES;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails" });
  const subject = t("guest_login_code.subject", { code, property: tenant.name });
  const codeBlock = `<p style="margin:8px 0 22px;font-family:'JetBrains Mono',Consolas,monospace;font-size:32px;letter-spacing:.3em;font-weight:700">${esc(code)}</p>`;
  return {
    to,
    subject,
    fromName: tenant.name,
    html: layout(tenant.accent, t("guest_login_code.title"), [
      p(t("guest_login_code.greeting")),
      p(t("guest_login_code.intro", { property: tenant.name })),
      codeBlock,
      p(t("guest_login_code.note")),
    ]),
    text: [
      t("guest_login_code.greeting"),
      t("guest_login_code.intro", { property: tenant.name }),
      code,
      t("guest_login_code.note"),
    ].join("\n\n"),
  };
}

/** Sign-in link for an existing admin account (owner, staff, platform admin) — in the platform's look. */
export function renderStaffLoginLink(
  platform: { name: string; accent: string },
  to: string,
  href: string,
): OutgoingEmail {
  const t = createTranslator({ locale: "sk", messages: MESSAGES.sk, namespace: "emails" });
  return {
    to,
    subject: t("staff_login_link.subject", { platform: platform.name }),
    fromName: platform.name,
    html: layout(
      platform.accent,
      t("staff_login_link.title"),
      [
        p(t("staff_login_link.greeting")),
        p(t("staff_login_link.intro")),
        p(t("staff_login_link.note")),
      ],
      { href, label: t("staff_login_link.button") },
    ),
    text: [
      t("staff_login_link.greeting"),
      t("staff_login_link.intro"),
      href,
      t("staff_login_link.note"),
    ].join("\n\n"),
  };
}
