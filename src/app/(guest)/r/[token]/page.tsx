import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarPlus,
  Check,
  CircleCheck,
  Clock,
  Download,
  MessageCircle,
  Phone,
} from "lucide-react";
import { startAccountFromReservation } from "@/core/guest/auth";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { payBySquarePng, payBySquareSvg } from "@/core/payments/pay-by-square";
import { diffDays } from "@/core/pricing/dates";
import { Container } from "@/core/sections/ui";
import { getTenantFromHost, requestHost } from "@/core/tenant/current";
import {
  reservationByToken,
  reservationExtras,
  tenantPublicHost,
} from "@/core/booking/reservation-view";
import { cn } from "@/lib/utils";
import { CancelToggle, CopyButton } from "./confirm-ui";

const TZ = "Europe/Bratislava";

/** Guest's reservation behind the secret link (no account needed) — confirmation page v2.1. */
export default async function ReservationPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const [t, tg, locale, tenant, host] = await Promise.all([
    getTranslations("guest.confirm"),
    getTranslations("guest"),
    getLocale(),
    getTenantFromHost(),
    requestHost(),
  ]);
  const r = await reservationByToken(token);

  // The page belongs to the client's own domain (header, footer, theme). Opened elsewhere (a technical address,
  // another client's domain) → move to the right one instead of showing a bare page.
  if (r && tenant?.id !== r.tenant_id) {
    const target = await tenantPublicHost(r.tenant_id);
    if (target && target !== host && !host?.endsWith(".localhost")) {
      redirect(`https://${target}/r/${token}`);
    }
  }
  if (!r || (tenant && r.tenant_id !== tenant.id)) {
    return (
      <Container className="py-16">
        <p className="text-muted-foreground">{tg("reservation.notFound")}</p>
      </Container>
    );
  }

  const x = await reservationExtras(r);
  const fmt = (cents: number) => formatMoney(money(cents, r.currency), locale);
  const whole = (cents: number) =>
    cents % 100 === 0
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: r.currency,
          maximumFractionDigits: 0,
        }).format(cents / 100)
      : fmt(cents);
  const nights = diffDays(r.check_in, r.check_out);
  const guests = r.adults + r.children;
  const firstName = r.guest_name.trim().split(/\s+/)[0] ?? "";
  const pending = r.status === "pending_payment";
  const cancelled = r.status === "cancelled";
  const paid =
    Boolean(x.paidAt) ||
    r.status === "confirmed" ||
    r.status === "in_progress" ||
    r.status === "completed";
  const qrInput =
    pending && r.bank?.iban && r.payment
      ? {
          iban: r.bank.iban,
          bic: r.bank.bic,
          beneficiary: r.bank.account_holder ?? r.property_name,
          amountCents: r.total_cents,
          currency: r.currency,
          variableSymbol: r.payment.variable_symbol,
          note: `${r.property_name} ${r.number}`,
        }
      : null;
  const [qr, qrPng] = qrInput
    ? await Promise.all([
        payBySquareSvg(qrInput).catch(() => null),
        payBySquarePng(qrInput).catch(() => null),
      ])
    : [null, null];
  const extras = r.lines.filter((l) => l.kind === "service").map((l) => l.label);
  const policy = tr(x.cancellationPolicy, locale);
  const policyFirst = policy ? policy.split(/(?<=\.)\s/)[0]!.replace(/\.$/, "") : "";
  const contact = x.contact;
  const iban = r.bank?.iban?.replace(/\s/g, "") ?? "";
  const dueAt = r.payment_due_at ? formatDateTime(r.payment_due_at, locale, TZ) : "";

  const hero = cancelled
    ? {
        title: t("hero.cancelled"),
        title2: t("hero.cancelled2"),
        text: x.cancelledReason ?? t("hero.cancelledText"),
      }
    : r.status === "in_progress"
      ? {
          title: t("hero.inProgress", { name: firstName }),
          title2: t("hero.inProgress2"),
          text: t("hero.inProgressText"),
        }
      : r.status === "completed"
        ? {
            title: t("hero.completed", { name: firstName }),
            title2: t("hero.completed2"),
            text: t("hero.completedText"),
          }
        : paid
          ? {
              title: t("hero.paid", { name: firstName }),
              title2: t("hero.paid2"),
              text: t("hero.paidText", { days: x.arrivalDays }),
            }
          : {
              title: t("hero.pending", { name: firstName }),
              title2: t("hero.pending2"),
              text: t("hero.pendingText", { email: r.guest_email }),
            };

  // What happens next: pay → we confirm → arrival instructions → arrival.
  const stage = r.status === "completed" ? 5 : r.status === "in_progress" ? 4 : paid ? 3 : 1;
  const steps = [
    {
      title: t("steps.pay"),
      text: pending && dueAt ? t("steps.payBy", { date: dueAt }) : t("steps.paid"),
    },
    { title: t("steps.confirm"), text: t("steps.confirmText") },
    { title: t("steps.instructions"), text: t("steps.instructionsText", { days: x.arrivalDays }) },
    {
      title: t("steps.arrival"),
      text: `${formatDate(r.check_in, locale, "long")}${x.checkInFrom ? `, ${t("from", { time: x.checkInFrom })}` : ""}`,
    },
  ];

  const initials = (contact?.name ?? r.property_name)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const stayCard = (
    <div className="bg-surface-accent flex flex-col gap-5 rounded-lg px-7 pt-7 pb-6 text-white lg:sticky lg:top-6">
      <div className="grid gap-0.5">
        <span className="text-on-accent-muted font-mono text-[11px] font-medium tracking-[0.1em] uppercase">
          {t("yourStay")}
        </span>
        <span className="text-xl font-extrabold tracking-tight">{r.property_name}</span>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/25 bg-white/12">
        {[
          {
            label: tg("property.arrival"),
            date: r.check_in,
            time: x.checkInFrom ? t("from", { time: x.checkInFrom }) : "",
          },
          {
            label: tg("property.departure"),
            date: r.check_out,
            time: x.checkOutUntil ? t("until", { time: x.checkOutUntil }) : "",
          },
        ].map((c, i) => (
          <span
            key={c.label}
            className={cn("grid gap-1 px-4 py-3", i === 0 && "border-r border-white/25")}
          >
            <span className="text-on-accent-soft font-mono text-[10px] tracking-[0.1em] uppercase">
              {c.label}
            </span>
            <span className="font-bold">{formatDate(c.date, locale)}</span>
            {c.time ? <span className="text-on-accent-soft text-xs">{c.time}</span> : null}
          </span>
        ))}
      </div>
      {x.navigation && !cancelled ? (
        <a
          href={x.navigation}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-white/40 px-4 text-sm font-medium text-white hover:bg-white/10"
        >
          {tg("v2.navigate")} <span aria-hidden>↗</span>
        </a>
      ) : null}
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-on-accent-muted">{t("guests")}</dt>
          <dd className="text-right">{tg("cart.guestsCount", { count: guests })}</dd>
        </div>
        {extras.length > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-on-accent-muted">{t("extras")}</dt>
            <dd className="text-right">{extras.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      <div className="grid gap-1 border-t border-white/20 pt-4">
        <span className="text-on-accent-muted font-mono text-[11px] tracking-[0.1em] uppercase">
          {cancelled ? t("total") : paid ? t("paid") : t("toPay")}
        </span>
        <span className="text-[34px] leading-none font-extrabold tracking-tight tabular-nums">
          {whole(r.total_cents)}
        </span>
        <span className="text-on-accent-muted text-[13px]">
          {tg("cart.perPersonNight", {
            price: whole(Math.round(r.total_cents / Math.max(1, guests) / Math.max(1, nights))),
          })}
        </span>
      </div>
      {!cancelled ? (
        <a
          href={`/r/${token}/ics`}
          download={`pobyt-${r.number}.ics`}
          className="btn-on-accent inline-flex min-h-12 w-full items-center justify-center gap-2.5 px-6"
        >
          <CalendarPlus className="size-4" /> {t("addToCalendar")}
        </a>
      ) : null}
      {contact?.phone || contact?.whatsapp ? (
        <div className="bg-accent-deep -mx-7 -mb-6 flex items-center gap-3 rounded-b-lg px-7 py-4">
          <span className="text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold">
            {initials}
          </span>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="text-on-accent-muted text-xs">{tg("v2.questions")}</span>
            <span className="text-[15px] font-bold">{contact.name ?? tg("v2.ownerFallback")}</span>
          </span>
          {contact.whatsapp ? (
            <a
              href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(t("waText", { number: r.number }))}`}
              aria-label={tg("cart.whatsapp")}
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <MessageCircle className="size-4" />
            </a>
          ) : null}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              aria-label={tg("cart.call")}
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <Phone className="size-4" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const rows = [
    {
      label: tg("reservation.amount"),
      value: (r.total_cents / 100).toFixed(2).replace(".", ","),
      display: fmt(r.total_cents),
      copy: true,
      kind: "amount" as const,
    },
    {
      label: tg("reservation.iban"),
      value: iban,
      display: iban.replace(/(.{4})/g, "$1 ").trim(),
      copy: true,
      kind: "mono" as const,
    },
    {
      label: tg("reservation.vs"),
      value: r.payment?.variable_symbol ?? "",
      display: r.payment?.variable_symbol ?? "",
      copy: true,
      kind: "mono" as const,
    },
    {
      label: tg("reservation.holder"),
      value: r.bank?.account_holder ?? "",
      display: r.bank?.account_holder ?? "",
      copy: false,
      kind: "text" as const,
    },
  ];
  const sectionTitle =
    "font-heading text-ink text-[28px] leading-tight font-extrabold tracking-tight sm:text-[34px]";

  return (
    <main className="pb-16">
      {/* Intro: status, first name, where the e-mail went */}
      <section className="border-b border-[#e3e6e2] bg-[linear-gradient(165deg,#f9f8f5_0%,#f2f3f0_50%,#e9eeeb_100%)]">
        <Container className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <CircleCheck
                className={cn("size-7", cancelled ? "text-muted-foreground" : "text-primary")}
              />
              <span className="text-ink font-mono text-sm">
                {t("number", { number: r.number })}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  pending
                    ? "bg-[#f6e7d8] text-[#7a3f17]"
                    : cancelled
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/12 text-primary",
                )}
              >
                {tg(`reservation.status.${r.status}`)}
              </span>
            </div>
            <h1 className="font-heading text-ink text-[34px] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl">
              {hero.title} <span className="text-ink-soft">{hero.title2}</span>
            </h1>
            <p className="max-w-[60ch] text-lg leading-relaxed text-[#5a6672]">{hero.text}</p>
          </div>
          <div className="border-line overflow-hidden rounded-lg border bg-white">
            {x.cover ? (
              <div className="relative h-40">
                <Image
                  src={x.cover.url}
                  alt=""
                  fill
                  sizes="360px"
                  className="object-cover"
                  priority
                />
              </div>
            ) : null}
            <div className="grid gap-0.5 px-5 py-4">
              <span className="text-ink font-bold">{r.property_name}</span>
              <span className="text-sm text-[#5a6672]">
                {formatDate(r.check_in, locale)} – {formatDate(r.check_out, locale)} ·{" "}
                {tg("booking.nights", { count: nights })} ·{" "}
                {tg("cart.guestsCount", { count: guests })}
              </span>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid items-start gap-10 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-12">
          {/* Payment (only while waiting): on phones the details with Copy first, the QR below them */}
          {pending && r.payment ? (
            <section className="grid gap-6">
              <div className="grid gap-3">
                <p className="kicker kicker-sans text-accent-2">{t("payKicker")}</p>
                <h2 className={sectionTitle}>
                  {t("payTitle")} <span className="text-ink-soft">{t("payTitle2")}</span>
                </h2>
              </div>
              <div className="border-line grid overflow-hidden rounded-lg border bg-white sm:grid-cols-[250px_minmax(0,1fr)]">
                {qr ? (
                  <div className="border-line order-2 grid content-start justify-items-center gap-3 border-t bg-[#fbfaf9] p-6 sm:order-1 sm:border-t-0 sm:border-r">
                    <div
                      role="img"
                      aria-label={tg("reservation.qrHint")}
                      className="w-full max-w-[200px] rounded-md bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qr }}
                    />
                    <span className="text-ink font-mono text-[11px] tracking-widest uppercase">
                      PAY by square
                    </span>
                    <span className="hidden text-center text-sm text-[#5a6672] sm:block">
                      {t("qrDesktop")}
                    </span>
                    <span className="text-center text-sm text-[#5a6672] sm:hidden">
                      {t("qrMobile")}
                    </span>
                    {qrPng ? (
                      <a
                        href={qrPng}
                        download={`qr-${r.number}.png`}
                        className="border-line text-ink inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium sm:hidden"
                      >
                        <Download className="size-4" /> {t("saveQr")}
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="order-1 grid content-start sm:order-2">
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="border-line flex items-center justify-between gap-3 border-b px-5 py-4"
                    >
                      <span className="grid min-w-0 gap-1">
                        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            "text-ink break-all",
                            row.kind === "amount" && "text-2xl font-extrabold tabular-nums",
                            row.kind === "mono" && "font-mono text-[15px]",
                          )}
                        >
                          {row.display}
                        </span>
                      </span>
                      {row.copy && row.value ? (
                        <CopyButton value={row.value} label={row.label} />
                      ) : null}
                    </div>
                  ))}
                  {dueAt ? (
                    <div className="text-ink flex items-center gap-2 px-5 py-4 text-sm">
                      <Clock className="text-accent-2 size-4 shrink-0" />
                      <span>
                        {t.rich("payUntil", { date: dueAt, b: (c) => <strong>{c}</strong> })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {/* Paid: a green strip instead of the payment card */}
          {!pending && !cancelled && x.paidAt ? (
            <section className="bg-surface-accent flex items-center gap-4 rounded-lg px-6 py-5 text-white">
              <CircleCheck className="size-7 shrink-0" />
              <span className="grid gap-0.5">
                <span className="text-lg font-bold">
                  {t("paidStrip", {
                    amount: whole(r.total_cents),
                    date: formatDate(x.paidAt.slice(0, 10), locale),
                  })}
                </span>
                <span className="text-on-accent-soft text-sm">{t("paidStripText")}</span>
              </span>
            </section>
          ) : null}

          {/* What happens next */}
          {!cancelled ? (
            <section className="grid gap-6">
              <div className="grid gap-3">
                <p className="kicker kicker-sans text-accent-2">{t("nextKicker")}</p>
                <h2 className={sectionTitle}>
                  {t("nextTitle")} <span className="text-ink-soft">{t("nextTitle2")}</span>
                </h2>
              </div>
              <ol className="grid gap-0 sm:grid-cols-4 sm:gap-4">
                {steps.map((s, i) => {
                  const n = i + 1;
                  const done = n < stage;
                  const current = n === stage;
                  return (
                    <li
                      key={s.title}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "relative grid content-start gap-2 pb-6 pl-12 sm:border-t-2 sm:pt-4 sm:pb-0 sm:pl-0",
                        done || current ? "sm:border-primary" : "sm:border-line",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0 left-0 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold sm:static",
                          done
                            ? "bg-primary text-primary-foreground"
                            : current
                              ? "border-primary text-primary border-2 bg-white"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="size-4" /> : n}
                      </span>
                      {i < steps.length - 1 ? (
                        <span
                          aria-hidden
                          className="bg-line absolute top-9 bottom-0 left-4 w-px sm:hidden"
                        />
                      ) : null}
                      <span
                        className={cn("font-bold", done || current ? "text-ink" : "text-[#5a6672]")}
                      >
                        {s.title}
                      </span>
                      <span className="text-sm text-[#5a6672]">{s.text}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {/* Phones: the green stay card after the steps */}
          <div className="lg:hidden">{stayCard}</div>

          {/* Price breakdown */}
          <section className="grid gap-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
              {t("breakdown")}
            </p>
            <dl className="border-line grid border-t">
              {r.lines.map((l, i) => (
                <div
                  key={i}
                  className="border-line flex justify-between gap-3 border-b py-3 text-[15px]"
                >
                  <dt className="text-[#3b3d42]">
                    {l.label}
                    {l.kind === "accommodation"
                      ? ` · ${l.quantity} × ${fmt(l.unit_amount_cents)}`
                      : ""}
                  </dt>
                  <dd className="text-ink tabular-nums">{fmt(l.amount_cents)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-3 text-lg font-extrabold">
                <dt className="text-ink">{tg("booking.total")}</dt>
                <dd className="text-ink tabular-nums">{whole(r.total_cents)}</dd>
              </div>
            </dl>
          </section>

          {/* Guest account — a quiet row */}
          {!cancelled ? (
            <section className="border-line flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4">
              <span className="grid gap-0.5">
                <span className="text-ink font-bold">{t("accountTitle")}</span>
                <span className="text-sm text-[#5a6672]">{t("accountText")}</span>
              </span>
              <form action={startAccountFromReservation.bind(null, token)}>
                <button
                  type="submit"
                  className="border-line text-ink inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium hover:bg-[#f7f4ed]"
                >
                  {t("accountCta")}
                </button>
              </form>
            </section>
          ) : null}

          {/* Change of plans */}
          {pending || r.status === "confirmed" ? (
            <section className="grid gap-2 text-[15px]">
              <span className="text-ink font-bold">{t("changeTitle")}</span>
              {r.cancellation_requested_at ? (
                <span className="text-[#5a6672]">{tg("reservation.cancelRequested")}</span>
              ) : (
                <span className="text-[#5a6672]">
                  {policyFirst ? `${policyFirst}. ` : ""}
                  {t("changeText")}{" "}
                  <CancelToggle token={token} label={tg("reservation.cancelRequest")} />
                </span>
              )}
            </section>
          ) : null}

          {r.status === "completed" ? (
            <Link
              href={`/p/${r.property_slug}?adults=${r.adults}&children=${r.children}`}
              className="bg-primary text-primary-foreground inline-flex min-h-12 items-center justify-self-start rounded-full px-6 font-bold"
            >
              {t("bookAgain")}
            </Link>
          ) : null}

          <p className="text-muted-foreground text-sm">{tg("reservation.keepLink")}</p>
        </div>

        <aside className="hidden lg:block">{stayCard}</aside>
      </Container>
    </main>
  );
}
