import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, Clock, FileText, KeyRound, MessageCircle, Phone } from "lucide-react";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import {
  arrivalInstructions,
  arrivalNavigation,
  bankDetails,
  listStays,
  requireGuest,
  stayDocuments,
} from "@/core/guest/zone";
import { tr } from "@/core/i18n/localized";
import { ModuleSlot } from "@/core/modules/module-slot";
import { money } from "@/core/money/money";
import { payBySquareSvg } from "@/core/payments/pay-by-square";
import { diffDays, todayIso } from "@/core/pricing/dates";
import { Container } from "@/core/sections/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebookHref, StatusBadge } from "../../stay-ui";
import { CancelStayForm } from "../../zone-forms";

/**
 * One stay in the guest zone (B10, design v2.3 `UcetPobyt`): intro, then the content (payment, arrival instructions,
 * modules, documents, breakdown, cancellation) and on the right what modules add (stay account) with the contact.
 */
export async function StayDetail({ id, crumbs }: { id: string; crumbs?: ReactNode }) {
  const { tenant } = await requireGuest();
  const stay = (await listStays()).find((s) => s.id === id);
  if (!stay) notFound();
  const [t, tg, locale, docs, instructions] = await Promise.all([
    getTranslations("guest.account"),
    getTranslations("guest"),
    getLocale(),
    stayDocuments(stay),
    arrivalInstructions(stay.id),
  ]);
  const fmt = (cents: number) => formatMoney(money(cents, stay.currency), locale);
  const pending = stay.status === "pending_payment";
  const bank = pending ? await bankDetails(tenant.id) : null;
  const qr =
    pending && bank?.iban && stay.payment
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
  const { data: settings } = await createAdminClient()
    .from("tenant_settings")
    .select("arrival_email_days_before, contact_name, contact_phone, whatsapp_phone")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  const rebook = rebookHref(stay);
  const navigation = instructions ? await arrivalNavigation(stay.property_id) : null;
  const active = stay.status !== "cancelled" && stay.status !== "completed";
  const daysToArrival = diffDays(todayIso(), stay.checkIn);
  const hero =
    stay.status === "cancelled"
      ? t("hero.cancelled")
      : stay.status === "completed"
        ? t("hero.completed")
        : stay.status === "in_progress"
          ? t("hero.inProgress")
          : t("hero.upcoming");
  const contactName = settings?.contact_name?.trim() || null;
  const initials = (contactName ?? stay.property?.name ?? tenant.name)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
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
              {hero} <span className="text-ink-soft">{stay.property?.name ?? ""}</span>
            </h1>
            <p className="text-ink text-[17px]">
              {formatDate(stay.checkIn, locale)} – {formatDate(stay.checkOut, locale)} ·{" "}
              {tg("booking.nights", { count: diffDays(stay.checkIn, stay.checkOut) })} ·{" "}
              {tg("cart.guestsCount", { count: stay.adults + stay.children })}
              {stay.infants ? ` + ${stay.infants}` : ""}
            </p>
            {rebook && !active ? (
              <Link
                href={rebook}
                className="border-line text-ink inline-flex min-h-11 items-center justify-self-start rounded-full border bg-white px-5 text-sm font-medium"
              >
                {t("rebook")}
              </Link>
            ) : null}
          </div>
          {active && daysToArrival > 0 ? (
            <span className="font-mono text-xs tracking-[0.08em] text-[#5a6672] uppercase">
              {t("arrivesIn", { count: daysToArrival })}
            </span>
          ) : null}
        </Container>
      </section>

      <Container className="grid items-start gap-10 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="grid min-w-0 gap-10">
          {pending && stay.payment ? (
            <section className="bg-card border-line grid gap-6 rounded-lg border p-6 sm:grid-cols-[1fr_200px]">
              <div className="grid content-start gap-3">
                <h2 className="font-heading text-xl font-bold">{tg("reservation.payTitle")}</h2>
                {stay.payment_due_at ? (
                  <p className="inline-flex items-center gap-2 text-sm">
                    <Clock className="size-4" />
                    {t("payBy", {
                      date: formatDateTime(stay.payment_due_at, locale, "Europe/Bratislava"),
                    })}
                  </p>
                ) : null}
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{tg("reservation.amount")}</dt>
                  <dd className="text-base font-semibold tabular-nums">{fmt(stay.total_cents)}</dd>
                  <dt className="text-muted-foreground">{tg("reservation.iban")}</dt>
                  <dd className="font-mono">{bank?.iban?.replace(/(.{4})/g, "$1 ").trim()}</dd>
                  <dt className="text-muted-foreground">{tg("reservation.holder")}</dt>
                  <dd>{bank?.account_holder}</dd>
                  <dt className="text-muted-foreground">{tg("reservation.vs")}</dt>
                  <dd className="font-mono">{stay.payment.variable_symbol}</dd>
                </dl>
              </div>
              {qr ? (
                <div className="grid content-start justify-items-center gap-2">
                  <div
                    role="img"
                    aria-label={tg("reservation.qrHint")}
                    className="w-full max-w-[200px] rounded-xl bg-white p-2"
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <p className="text-muted-foreground text-center text-xs">
                    {tg("reservation.qrHint")}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <ModuleSlot
            name="guest.stay.top"
            tenantId={tenant.id}
            locale={locale}
            reservationId={stay.id}
          />

          {active ? (
            <section className="bg-surface border-line grid gap-3 rounded-lg border p-6">
              <h2 className="font-heading inline-flex items-center gap-2 text-xl font-bold">
                <KeyRound className="text-primary size-5" /> {t("arrival")}
              </h2>
              {instructions ? (
                <>
                  <p className="leading-relaxed whitespace-pre-line">{tr(instructions, locale)}</p>
                  {navigation ? (
                    <a
                      href={navigation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink border-line inline-flex min-h-10 items-center gap-2 self-start rounded-full border px-4 text-sm font-medium hover:bg-black/5"
                    >
                      {tg("v2.navigate")} <span aria-hidden>↗</span>
                    </a>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("arrivalLater", { days: settings?.arrival_email_days_before ?? 3 })}
                </p>
              )}
            </section>
          ) : null}

          <ModuleSlot
            name="guest.stay.main"
            tenantId={tenant.id}
            locale={locale}
            reservationId={stay.id}
          />

          {docs.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-bold">{t("documents")}</h2>
              <ul className="border-line divide-line grid divide-y border-y">
                {docs.map((d) => (
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
          ) : null}

          <section className="grid gap-3">
            <h2 className="font-heading text-xl font-bold">{tg("reservation.breakdown")}</h2>
            <dl className="grid gap-2 text-sm">
              {stay.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {l.label}
                    {l.kind === "accommodation"
                      ? ` · ${l.quantity} × ${fmt(l.unit_amount_cents)}`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">{fmt(l.amount_cents)}</dd>
                </div>
              ))}
              <div className="border-line flex justify-between border-t pt-2 text-base font-semibold">
                <dt>{tg("booking.total")}</dt>
                <dd className="tabular-nums">{fmt(stay.total_cents)}</dd>
              </div>
            </dl>
          </section>

          {stay.status === "pending_payment" || stay.status === "confirmed" ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-bold">{tg("reservation.cancelTitle")}</h2>
              {stay.cancellation_requested_at ? (
                <p className="text-sm">{tg("reservation.cancelRequested")}</p>
              ) : (
                <CancelStayForm reservationId={stay.id} />
              )}
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6">
          <ModuleSlot
            name="guest.stay.aside"
            tenantId={tenant.id}
            locale={locale}
            reservationId={stay.id}
          />
          {settings?.contact_phone || settings?.whatsapp_phone ? (
            <div className="bg-surface border-line flex items-center gap-3 rounded-lg border px-[18px] py-4">
              <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#e9e5db] text-[13px] font-bold text-[#5a6672]">
                {initials}
              </span>
              <span className="grid min-w-0 flex-1 gap-px">
                <span className="text-ink text-sm font-medium">
                  {contactName
                    ? t("contactAsk", { name: contactName.split(/\s+/)[0] ?? contactName })
                    : tg("v2.questions")}
                </span>
                <span className="text-xs text-[#5a6672]">
                  {settings.contact_phone ?? settings.whatsapp_phone}
                </span>
              </span>
              {settings.whatsapp_phone ? (
                <a
                  href={`https://wa.me/${settings.whatsapp_phone.replace(/\D/g, "")}`}
                  aria-label={tg("cart.whatsapp")}
                  className="text-ink inline-flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <MessageCircle className="size-4" />
                </a>
              ) : null}
              {settings.contact_phone ? (
                <a
                  href={`tel:${settings.contact_phone.replace(/\s/g, "")}`}
                  aria-label={tg("cart.call")}
                  className="text-ink inline-flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <Phone className="size-4" />
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </Container>
    </>
  );
}
