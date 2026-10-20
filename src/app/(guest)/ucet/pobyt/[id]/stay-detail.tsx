import { StayContactFoot } from "@/core/guest/stay-contact";
import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, FileText, Lock, MessageCircle } from "lucide-react";
import { CopyButton } from "@/app/(guest)/r/[token]/confirm-ui";
import { cancellationOutcome, parseBands } from "@/core/booking/cancellation";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { loadStay } from "@/core/guest/stay-access";
import { arrivalNavigation, bankDetails } from "@/core/guest/zone";
import { tr } from "@/core/i18n/localized";
import { ModuleSlot } from "@/core/modules/module-slot";
import { guestContactByModule } from "@/core/modules/registry";
import { money } from "@/core/money/money";
import { payBySquareSvg } from "@/core/payments/pay-by-square";
import { diffDays, todayIso } from "@/core/pricing/dates";
import { Container } from "@/core/sections/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebookHref, StatusBadge } from "../../stay-ui";
import { CancelDialog } from "./cancel-dialog";
import { stayPhase, stayStateOf, type StayPhase } from "./stay-state";

/**
 * One stay in the guest zone (B10, designs v2.3 `UcetPobyt` and v2.4 `StavyPobytu`). The page follows the state:
 * waiting for payment (payment card on top, ordering after payment), before arrival, during the stay (unlocked
 * instructions as tiles), after departure, cancelled (when and what is returned, no modules). On the right the green
 * "Účet pobytu" with the price breakdown and what modules add (slot guest.stay.account), and the contact.
 */
export async function StayDetail({
  id,
  token,
  crumbs,
}: {
  /** Through the account (`/ucet/pobyt/<id>`) … */
  id?: string;
  /** … or through the access link `/r/<code>` after payment (Z49): no account tabs, modules get the code. */
  token?: string;
  crumbs?: ReactNode;
}) {
  const {
    tenant,
    stay,
    docs,
    state: rawState,
  } = await loadStay(token ? { token } : { id: id ?? "" });
  const today = todayIso();
  const phase = stayPhase(stay.status, stay.checkIn, stay.checkOut, today);
  // A module may add "Napísať správu" to the contact foot (messages) — the foot shows even without a phone (Z70).
  const contactByModule = await guestContactByModule(tenant.id);
  const state = stayStateOf(rawState);
  const [t, tg, ts, locale, { data: settings }] = await Promise.all([
    getTranslations("guest.account"),
    getTranslations("guest"),
    getTranslations("guest.stay"),
    getLocale(),
    createAdminClient()
      .from("tenant_settings")
      .select(
        "contact_name, contact_phone, whatsapp_phone, cancellation_policy, cancellation_bands",
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
  ]);
  const fmt = (cents: number) => formatMoney(money(cents, stay.currency), locale);
  const bank = phase === "pending" ? await bankDetails(tenant.id) : null;
  const qr =
    phase === "pending" && bank?.iban && stay.payment
      ? await payBySquareSvg({
          iban: bank.iban,
          bic: bank.bic ?? undefined,
          beneficiary: bank.account_holder ?? stay.property?.name ?? tenant.name,
          amountCents: stay.total_cents,
          currency: stay.currency,
          variableSymbol: stay.payment.variable_symbol ?? stay.number.replace(/\D/g, ""),
          note: `${stay.property?.name ?? ""} ${stay.number}`.trim(),
        }).catch(() => null)
      : null;
  const arrival = state?.arrival ?? null;
  const navigation = arrival?.visible ? await arrivalNavigation(stay.property_id) : null;
  const rebook = rebookHref(stay);
  const daysToArrival = diffDays(today, stay.checkIn);
  const contactName = settings?.contact_name?.trim() || null;
  const ownerFirst = contactName?.split(/\s+/)[0] ?? null;
  const policy = tr(settings?.cancellation_policy, locale);
  const policyFirst = policy ? policy.split(/(?<=\.)\s/)[0]! : "";
  const contactHref = settings?.whatsapp_phone
    ? `https://wa.me/${settings.whatsapp_phone.replace(/\D/g, "")}`
    : settings?.contact_phone
      ? `tel:${settings.contact_phone.replace(/\s/g, "")}`
      : null;
  const iban = bank?.iban?.replace(/\s/g, "") ?? "";
  const vs = stay.payment?.variable_symbol ?? "";
  const hero: Record<StayPhase, [string, string]> = {
    pending: [ts("hero.pending"), ts("hero.pending2")],
    before: [t("hero.upcoming"), stay.property?.name ?? ""],
    during: [ts("hero.during"), ts("hero.during2")],
    after: [t("hero.completed"), stay.property?.name ?? ""],
    cancelled: [ts("hero.cancelled"), ts("hero.cancelled2")],
  };
  const modules = phase !== "cancelled";
  // Storno bands of the client (optional): what this cancellation would mean today.
  const paidCents = stay.payments
    .filter((p) => p.status === "received")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const outcome = cancellationOutcome(
    parseBands(settings?.cancellation_bands),
    daysToArrival,
    stay.total_cents,
    paidCents,
  );
  const canRequestCancel =
    (stay.status === "pending_payment" || stay.status === "confirmed") && daysToArrival > 0;

  return (
    <main>
      <section className="border-b border-[#e3e6e2] bg-[linear-gradient(165deg,#f9f8f5_0%,#f2f3f0_50%,#e9eeeb_100%)]">
        <Container className="flex flex-wrap items-end justify-between gap-5 py-9 sm:py-10">
          <div className="grid gap-3">
            {crumbs ?? (
              <Link
                href="/ucet"
                className="inline-flex items-center gap-1 justify-self-start text-sm text-[#5a6672] hover:text-[#11212f]"
              >
                <ChevronLeft className="size-4" /> {t("back")}
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs font-medium tracking-[0.1em] text-[#5a6672] uppercase">
                {t("reservationNo", { number: stay.number })}
              </span>
              <StatusBadge status={stay.status} />
            </div>
            <h1 className="font-heading text-ink text-[32px] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[40px]">
              {hero[phase][0]} <span className="text-ink-soft">{hero[phase][1]}</span>
            </h1>
            <p className="text-ink text-[17px]">
              {formatDate(stay.checkIn, locale)} – {formatDate(stay.checkOut, locale)} ·{" "}
              {tg("booking.nights", { count: diffDays(stay.checkIn, stay.checkOut) })} ·{" "}
              {tg("cart.guestsCount", { count: stay.adults + stay.children })}
              {stay.infants ? ` + ${stay.infants}` : ""}
            </p>
            {modules ? (
              <ModuleSlot
                name="guest.stay.header"
                tenantId={tenant.id}
                locale={locale}
                reservationId={stay.id}
                accessToken={token}
              />
            ) : null}
            {rebook && phase === "after" ? (
              <Link
                href={rebook}
                className="border-line text-ink inline-flex min-h-11 items-center justify-self-start rounded-full border bg-white px-5 text-sm font-medium"
              >
                {t("rebook")}
              </Link>
            ) : null}
          </div>
          {(phase === "before" || phase === "pending") && daysToArrival > 0 ? (
            <span className="font-mono text-xs tracking-[0.08em] text-[#5a6672] uppercase">
              {t("arrivesIn", { count: daysToArrival })}
            </span>
          ) : null}
        </Container>
      </section>

      <Container className="grid items-start gap-10 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="grid min-w-0 gap-10">
          {/* Waiting for payment: the payment card on top (design v2.4). */}
          {phase === "pending" && stay.payment ? (
            <section
              aria-labelledby="pay-title"
              className="grid overflow-hidden rounded-lg border border-[#ecd9c4] bg-[#fdf7f0] sm:grid-cols-[220px_minmax(0,1fr)]"
            >
              {qr ? (
                <div className="order-2 grid content-start justify-items-center gap-2 border-t border-[#ecd9c4] bg-white p-5 sm:order-1 sm:border-t-0 sm:border-r">
                  <div
                    role="img"
                    aria-label={tg("reservation.qrHint")}
                    className="w-full max-w-[180px]"
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <span className="text-ink font-mono text-[11px] tracking-widest uppercase">
                    PAY by square
                  </span>
                </div>
              ) : null}
              <div className="order-1 grid content-start gap-3 p-5 sm:order-2 sm:p-6">
                <span className="text-xs font-medium tracking-[0.16em] text-[#8a4a1c] uppercase">
                  {ts("pay.kicker")}
                </span>
                <h2 id="pay-title" className="text-ink text-[22px] font-extrabold tracking-tight">
                  {stay.payment_due_at
                    ? ts("pay.until", {
                        date: formatDateTime(stay.payment_due_at, locale, "Europe/Bratislava"),
                      })
                    : ts("pay.title")}{" "}
                  <span className="text-ink-soft">{ts("pay.held")}</span>
                </h2>
                <dl className="grid gap-1">
                  {[
                    {
                      k: tg("reservation.amount"),
                      v: fmt(stay.total_cents),
                      copy: (stay.total_cents / 100).toFixed(2).replace(".", ","),
                      big: true,
                    },
                    {
                      k: tg("reservation.iban"),
                      v: iban.replace(/(.{4})/g, "$1 ").trim(),
                      copy: iban,
                    },
                    { k: tg("reservation.vs"), v: vs, copy: vs },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-[#ecd9c4] py-2 last:border-b-0"
                    >
                      <dt className="font-mono text-[11px] tracking-[0.1em] text-[#5a6672] uppercase">
                        {row.k}
                      </dt>
                      <dd
                        className={
                          row.big
                            ? "text-ink col-start-1 text-xl font-extrabold tabular-nums"
                            : "text-ink col-start-1 font-mono text-[15px] break-all"
                        }
                      >
                        {row.v}
                      </dd>
                      {row.copy ? (
                        <dd className="col-start-2 row-span-2 row-start-1">
                          <CopyButton value={row.copy} label={row.k} />
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
                <p className="text-sm text-[#5b3a1f]">{ts("pay.autoCancel")}</p>
              </div>
            </section>
          ) : null}

          {/* Cancelled: when, why and what is returned (design v2.4). */}
          {phase === "cancelled" ? (
            <section className="guest-card grid gap-3 rounded-lg p-6">
              <h2 className="text-ink text-[22px] font-extrabold tracking-tight">
                {ts("cancelled.title")}
              </h2>
              <p className="text-[15px] leading-relaxed text-[#3b3d42]">
                {state?.cancelledAt
                  ? ts("cancelled.when", {
                      date: formatDate(state.cancelledAt.slice(0, 10), locale),
                    })
                  : ts("cancelled.whenUnknown")}
                {state?.cancelledReason
                  ? ` ${ts("cancelled.reason", { reason: state.cancelledReason })}`
                  : ""}{" "}
                {state && state.refundedCents > 0
                  ? ts("cancelled.refunded", { amount: fmt(state.refundedCents) })
                  : stay.payment?.status === "received"
                    ? ts("cancelled.refundByPolicy", { name: ownerFirst ?? "none" })
                    : ""}
              </p>
              {rebook ? (
                <Link
                  href={rebook}
                  className="inline-flex min-h-11 items-center justify-self-start rounded-full bg-[#2b3036] px-5 text-sm font-bold text-white hover:bg-[#0c0e11]"
                >
                  {ts("cancelled.newDates")}
                </Link>
              ) : null}
            </section>
          ) : null}

          {modules ? (
            <ModuleSlot
              name="guest.stay.top"
              tenantId={tenant.id}
              locale={locale}
              reservationId={stay.id}
              accessToken={token}
            />
          ) : null}

          {/* Arrival instructions: unlocked as tiles, or when and why they unlock. */}
          {arrival && (phase === "before" || phase === "during" || phase === "pending") ? (
            arrival.visible ? (
              <section
                aria-labelledby="arrival-title"
                className="guest-card grid gap-4 rounded-lg p-6"
              >
                <div className="grid gap-1">
                  <span className="text-accent-2 text-xs font-medium tracking-[0.16em] uppercase">
                    {ts("arrival.kicker")}
                  </span>
                  <h2
                    id="arrival-title"
                    className="text-ink text-[22px] font-extrabold tracking-tight"
                  >
                    {ts("arrival.title")}
                  </h2>
                </div>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    arrival.doorCode
                      ? {
                          k: ts("arrival.doorCode"),
                          v: arrival.doorCode,
                          n: arrival.checkInFrom
                            ? ts("arrival.doorFrom", { time: arrival.checkInFrom })
                            : "",
                        }
                      : null,
                    arrival.wifiName
                      ? {
                          k: ts("arrival.wifi"),
                          v: arrival.wifiName,
                          n: arrival.wifiPassword
                            ? ts("arrival.wifiPassword", { password: arrival.wifiPassword })
                            : "",
                        }
                      : null,
                    arrival.checkInFrom
                      ? {
                          k: ts("arrival.checkIn"),
                          v: ts("arrival.from", { time: arrival.checkInFrom }),
                          n: "",
                        }
                      : null,
                    arrival.checkOutUntil
                      ? {
                          k: ts("arrival.checkOut"),
                          v: ts("arrival.until", { time: arrival.checkOutUntil }),
                          n: "",
                        }
                      : null,
                  ]
                    .filter((x): x is { k: string; v: string; n: string } => Boolean(x))
                    .map((f) => (
                      <div
                        key={f.k}
                        className="guest-card grid content-start gap-1 rounded-[10px] px-4 py-3"
                      >
                        <dt className="font-mono text-[11px] tracking-[0.1em] text-[#5a6672] uppercase">
                          {f.k}
                        </dt>
                        <dd className="text-ink text-lg font-extrabold tracking-tight [overflow-wrap:anywhere]">
                          {f.v}
                        </dd>
                        {f.n ? <dd className="text-xs text-[#5a6672]">{f.n}</dd> : null}
                      </div>
                    ))}
                </dl>
                {arrival.instructions ? (
                  <p className="leading-relaxed whitespace-pre-line">
                    {tr(arrival.instructions, locale)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2.5">
                  {navigation ? (
                    <a
                      href={navigation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink border-line inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium hover:bg-black/5"
                    >
                      {tg("v2.navigate")} <span aria-hidden>↗</span>
                    </a>
                  ) : null}
                  {contactHref ? (
                    <a
                      href={contactHref}
                      className="text-ink border-line inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium hover:bg-black/5"
                    >
                      <MessageCircle className="size-4" /> {ts("arrival.problem")}
                    </a>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="guest-card flex items-center gap-3.5 rounded-[10px] px-[22px] py-4">
                <Lock className="size-5 shrink-0 text-[#8b929b]" aria-hidden />
                <span className="grid gap-0.5">
                  <span className="text-ink text-[15px] font-medium">{ts("arrival.locked")}</span>
                  <span className="text-[13px] text-[#5a6672]">
                    {arrival.needsPayment
                      ? ts("arrival.afterPayment", { date: formatDate(arrival.from, locale) })
                      : arrival.needsCheckin
                        ? arrival.from <= today
                          ? ts("arrival.afterCheckinNow")
                          : ts("arrival.afterCheckin", { date: formatDate(arrival.from, locale) })
                        : ts("arrival.on", { date: formatDate(arrival.from, locale) })}
                  </span>
                </span>
              </section>
            )
          ) : null}

          {modules ? (
            <ModuleSlot
              name="guest.stay.main"
              tenantId={tenant.id}
              locale={locale}
              reservationId={stay.id}
              accessToken={token}
            />
          ) : null}

          {/* Issued documents (invoices, Z51) — also for a cancelled stay; then the files for guests. */}
          {[
            {
              key: "invoices",
              list: docs.filter((d) => d.kind === "invoice"),
              title: t("invoices"),
              hint: t("invoicesHint", { name: tenant.name }),
            },
            {
              key: "documents",
              list: phase === "cancelled" ? [] : docs.filter((d) => d.kind !== "invoice"),
              title: t("documents"),
              hint: null,
            },
          ].map((group) =>
            group.list.length > 0 ? (
              <section
                key={group.key}
                id={group.key === "invoices" ? "doklady" : undefined}
                className="grid gap-3"
              >
                <h2 className="font-heading text-xl font-bold">{group.title}</h2>
                {group.hint ? <p className="text-[15px] text-[#5a6672]">{group.hint}</p> : null}
                <ul className="border-line divide-line grid divide-y border-y">
                  {group.list.map((d) => (
                    <li key={d.id}>
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink inline-flex min-h-11 items-center gap-2 py-2 hover:underline"
                        >
                          <FileText className="text-primary size-4" /> {tr(d.title, locale)}
                        </a>
                      ) : (
                        <span className="inline-flex min-h-11 items-center gap-2 py-2">
                          {tr(d.title, locale)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}

          {/* Change or cancellation: a short block and the window (only before the stay). */}
          {canRequestCancel ? (
            <section className="border-line grid gap-2 border-t pt-6 text-[15px]">
              <h2 className="text-ink font-bold">{ts("change.title")}</h2>
              {stay.cancellation_requested_at ? (
                <p className="text-[#5a6672]">
                  {ts("change.requested", {
                    date: formatDate(stay.cancellation_requested_at.slice(0, 10), locale),
                    name: ownerFirst ?? "none",
                  })}
                </p>
              ) : (
                <>
                  <p className="text-[#5a6672]">
                    {policyFirst ? `${policyFirst} ` : ""}
                    {ts("change.text")}
                  </p>
                  <CancelDialog
                    reservationId={stay.id}
                    token={token}
                    daysToArrival={daysToArrival}
                    policy={policy}
                    ownerName={ownerFirst}
                    outcome={
                      outcome
                        ? {
                            refundPct: outcome.refundPct,
                            fee: outcome.feeCents > 0 ? fmt(outcome.feeCents) : null,
                            refund: paidCents > 0 ? fmt(outcome.refundCents) : null,
                          }
                        : null
                    }
                  />
                </>
              )}
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6">
          {/* Účet pobytu: the stay, its price breakdown, what modules add (orders), what is to pay or returned. */}
          <section
            aria-label={ts("account.title")}
            className="bg-surface-accent grid gap-3.5 rounded-lg px-6 py-[22px] text-white"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase">
                {ts("account.title")}
              </span>
              <span className="font-mono text-[11px]">{stay.number}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span>
                {ts("account.stay", {
                  nights: tg("booking.nights", { count: diffDays(stay.checkIn, stay.checkOut) }),
                })}
              </span>
              <span className="font-medium whitespace-nowrap tabular-nums">
                {fmt(stay.total_cents)}
                {phase !== "pending" && phase !== "cancelled" ? " ✓" : ""}
              </span>
            </div>
            <details className="group">
              <summary className="cursor-pointer list-none text-[13px] font-medium underline underline-offset-[3px] [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">{ts("account.breakdown")}</span>
                <span className="hidden group-open:inline">{ts("account.hideBreakdown")}</span>
              </summary>
              <dl className="mt-2.5 grid gap-1.5 border-l border-white/40 pl-3 text-[13px]">
                {stay.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <dt>
                      {l.label}
                      {l.kind === "accommodation"
                        ? ` · ${l.quantity} × ${fmt(l.unit_amount_cents)}`
                        : ""}
                    </dt>
                    <dd className="whitespace-nowrap tabular-nums">{fmt(l.amount_cents)}</dd>
                  </div>
                ))}
              </dl>
            </details>
            {modules ? (
              <ModuleSlot
                name="guest.stay.account"
                tenantId={tenant.id}
                locale={locale}
                reservationId={stay.id}
                accessToken={token}
              />
            ) : null}
            {phase === "pending" || phase === "cancelled" ? (
              <div className="grid gap-1 border-t border-white/25 pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">
                    {phase === "pending" ? ts("account.toPay") : ts("account.returned")}
                  </span>
                  <span className="text-[26px] font-extrabold tracking-tight tabular-nums">
                    {phase === "pending"
                      ? fmt(stay.total_cents)
                      : state && state.refundedCents > 0
                        ? fmt(state.refundedCents)
                        : "—"}
                  </span>
                </div>
              </div>
            ) : null}
            {/* Z70: the only contact of the stay — the foot of this card, no separate card under it. */}
            {phase !== "cancelled" &&
            (settings?.contact_phone || settings?.whatsapp_phone || contactByModule) ? (
              <StayContactFoot
                name={contactName ?? tg("v2.ownerFallback")}
                phone={settings?.contact_phone ?? null}
                whatsapp={settings?.whatsapp_phone ?? null}
                className="-mx-6 mt-1 -mb-[22px] px-6 py-4"
                write={
                  <ModuleSlot
                    name="guest.stay.contact"
                    tenantId={tenant.id}
                    locale={locale}
                    reservationId={stay.id}
                    accessToken={token}
                  />
                }
              />
            ) : null}
          </section>
        </aside>
      </Container>
    </main>
  );
}
