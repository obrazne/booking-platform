import "server-only";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CircleCheck, FileText, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { DocumentsManager } from "@/core/admin/documents";
import { InvoiceBasisSection } from "@/core/invoice/section";
import {
  PanelCollapsible,
  PanelSection,
  PanelSummary,
  type PanelContent,
} from "@/core/admin/record-panel";
import { StatusPill } from "@/core/admin/status";
import { ModuleSlot } from "@/core/modules/module-slot";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { cancellationOutcome, parseBands } from "@/core/booking/cancellation";
import { PanelTabs } from "@/core/admin/panel-tabs";
import { reservationTabs } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { CancelReservationButton, NoteForm, ReservationActions } from "./panel-actions";
import { getReservationDetail, SOURCES, type ReservationStatus } from "./query";
import { ExtendDueButton, MarkPaidButton } from "./quick-actions";

/**
 * Content of the reservation panel (Z26): only the detail is loaded — the reservation, its documents and the
 * property documents the guest gets — in parallel, not the list or the counts.
 */
export async function reservationPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, tc, tv, td, tg, locale, tenant, detail] = await Promise.all([
    getTranslations("reservations"),
    getTranslations("common"),
    getTranslations("adminV1.reservations"),
    getTranslations("documents"),
    getTranslations("guests"),
    getLocale(),
    getTenantInfo(active.tenantId),
    getReservationDetail(active.tenantId, id),
  ]);
  if (!detail) return { body: <p className="text-muted-foreground text-sm">{tc("noResults")}</p> };
  const supabase = await createClient();
  const [{ data: documents }, { data: propertyDocs }, { data: storno }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, visible_when, kind")
      .eq("reservation_id", detail.id)
      .order("created_at"),
    supabase
      .from("documents")
      .select("id, title, visible_when")
      .eq("property_id", detail.property_id)
      .is("reservation_id", null)
      .order("created_at"),
    supabase
      .from("tenant_settings")
      .select("cancellation_bands")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
  ]);
  // A guest's request to cancel: the proposal by the client's storno bands, as of the day of the request.
  const checkIn = detail.items.map((i) => i.check_in).sort()[0];
  const proposal =
    detail.cancellation_requested_at && checkIn
      ? cancellationOutcome(
          parseBands(storno?.cancellation_bands),
          diffDays(detail.cancellation_requested_at.slice(0, 10), checkIn),
          detail.total_cents,
          detail.payments
            .filter((p) => p.status === "received")
            .reduce((sum, p) => sum + p.amount_cents, 0),
        )
      : null;
  const fmt = (cents: number, currency = tenant.currency) =>
    formatMoney(money(cents, currency), locale);
  const when = (iso: string) => formatDateTime(iso, locale, tenant.timezone, "short");
  const statusLabel = (s: string) => t(`statuses.${s as ReservationStatus}`);
  const sourceLabel = (s: string) => t(`sources.${s as (typeof SOURCES)[number]}`);
  const people = (r: { adults: number; children: number }) =>
    r.children
      ? tv("peopleWithChildren", { adults: r.adults, children: r.children })
      : t("panel.adults", { count: r.adults });
  // Property documents this guest gets: "always", or "after confirmation" once the stay is confirmed.
  const confirmed = ["confirmed", "in_progress", "completed"].includes(detail.status);
  const guestGets = (propertyDocs ?? []).filter(
    (d) => d.visible_when === "always" || (d.visible_when === "confirmed" && confirmed),
  );

  // Tabs modules add (Z46, e.g. Správy) next to "Prehľad"; without them the panel stays one column.
  const moduleTabs = (
    await Promise.all(
      (await reservationTabs(active.tenantId)).map(async (tab) => {
        const r = await tab
          .render({ tenantId: active.tenantId, reservationId: detail.id, locale })
          .catch(() => null);
        return r ? { key: tab.key, ...r } : null;
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);
  const withTabs = (overview: ReactNode) =>
    moduleTabs.length ? (
      <PanelTabs
        tabs={[
          { key: "overview", label: t("panel.overviewTab"), content: overview },
          ...moduleTabs,
        ]}
      />
    ) : (
      overview
    );

  return {
    label: `${detail.number} · ${detail.guest_name}`,
    header: detail ? (
      <>
        <span className="text-ink font-mono text-[13px] font-medium">{detail.number}</span>
        <StatusPill status={detail.status} label={statusLabel(detail.status)} />
      </>
    ) : null,
    actions:
      detail && ["pending_payment", "confirmed", "in_progress"].includes(detail.status) ? (
        <>
          {detail.status === "pending_payment" ? (
            // Phone (07): the payment actions stick to the bottom while it waits for payment.
            <span className="flex w-full gap-2.5 md:hidden">
              <ExtendDueButton id={detail.id} className="min-h-11 flex-1" />
              <MarkPaidButton
                id={detail.id}
                amountLabel={fmt(detail.total_cents, detail.currency)}
                className="min-h-11 flex-1 font-bold"
              />
            </span>
          ) : null}
          <ReservationActions
            id={detail.id}
            status={detail.status}
            hasRequest={Boolean(detail.cancellation_requested_at)}
          />
          <span className="ml-auto" />
          <CancelReservationButton id={detail.id} label={detail.number} />
        </>
      ) : undefined,
    body: withTabs(
      <div className="grid gap-6 text-sm font-normal [&>*]:min-w-0">
        {(() => {
          const item = detail.items[0];
          return (
            <PanelSummary
              title={detail.guest_name}
              subtitle={
                <>
                  <a href={`mailto:${detail.guest_email}`} className="hover:underline">
                    {detail.guest_email}
                  </a>
                  {detail.guest_phone ? (
                    <>
                      {" · "}
                      <a href={`tel:${detail.guest_phone}`} className="hover:underline">
                        {detail.guest_phone}
                      </a>
                    </>
                  ) : null}
                  {/* Z68: the card of the guest (contact, consents, all stays). */}
                  {detail.guest_id ? (
                    <>
                      {" · "}
                      <Link
                        href={`/admin/guests?panel=guest:${detail.guest_id}`}
                        className="text-ink font-medium underline underline-offset-4"
                      >
                        {tg("card.open")}
                      </Link>
                    </>
                  ) : null}
                </>
              }
              facts={[
                ...(item
                  ? [
                      { label: tv("checkIn"), value: formatDate(item.check_in, locale) },
                      { label: tv("checkOut"), value: formatDate(item.check_out, locale) },
                      {
                        label: tv("nightsLabel"),
                        value: diffDays(item.check_in, item.check_out),
                      },
                    ]
                  : []),
                {
                  label: tv("people"),
                  value: [
                    people(detail),
                    detail.infants ? t("panel.infants", { count: detail.infants }) : null,
                    detail.pets ? t("panel.pets", { count: detail.pets }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
                { label: tv("amount"), value: fmt(detail.total_cents, detail.currency) },
                { label: t("source"), value: sourceLabel(detail.source) },
                {
                  label: tv("unit"),
                  value: `${detail.property?.name ?? ""}${item?.unit ? ` · ${item.unit.name}` : ""}`,
                },
              ]}
            >
              {/* Phone (07): call and e-mail as big buttons. */}
              <span className="flex gap-2.5 md:hidden">
                {detail.guest_phone ? (
                  <Button asChild variant="outline" className="min-h-11 flex-1">
                    <a href={`tel:${detail.guest_phone}`}>
                      <Phone /> {tv("call")}
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="min-h-11 flex-1">
                  <a href={`mailto:${detail.guest_email}`}>
                    <Mail /> {tv("email")}
                  </a>
                </Button>
              </span>
            </PanelSummary>
          );
        })()}

        {detail.cancellation_requested_at ? (
          <div className="card-warm rounded-[10px] px-[18px] py-3.5 text-[#5b3a1f]">
            <p className="font-bold">{t("panel.cancelRequest")}</p>
            {detail.cancellation_request_note ? (
              <p className="[overflow-wrap:anywhere]">
                {t("panel.cancelRequestNote", { note: detail.cancellation_request_note })}
              </p>
            ) : null}
            {proposal ? (
              <p>
                {t("panel.cancelProposal", {
                  refund: fmt(proposal.refundCents, detail.currency),
                  fee: fmt(proposal.feeCents, detail.currency),
                  pct: proposal.refundPct,
                })}
              </p>
            ) : null}
          </div>
        ) : null}

        {detail.status === "pending_payment" ? (
          <section className="card-warm flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-[18px] py-4">
            <span className="grid min-w-0 gap-0.5">
              <span className="text-ink text-[15px] font-bold">
                {tv("waiting", { amount: fmt(detail.total_cents, detail.currency) })}
              </span>
              <span className="text-muted-foreground text-[13px]">
                {[
                  detail.payments[0]
                    ? `${t("panel.vs")} ${detail.payments[0].variable_symbol}`
                    : null,
                  detail.payment_due_at ? tv("dueAt", { date: when(detail.payment_due_at) }) : null,
                  tv("autoCancel"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="hidden flex-wrap gap-2 md:flex">
              <MarkPaidButton
                id={detail.id}
                amountLabel={fmt(detail.total_cents, detail.currency)}
                className="font-bold"
              />
              <ExtendDueButton id={detail.id} />
            </span>
          </section>
        ) : detail.payments.some((p) => p.received_at) ? (
          <section className="bg-accent-soft flex items-center gap-3 rounded-[10px] px-[18px] py-3.5">
            <CircleCheck className="text-primary size-6 shrink-0" />
            <span className="grid gap-0.5">
              <span className="text-ink text-[15px] font-bold">
                {tv("paid", { amount: fmt(detail.total_cents, detail.currency) })}
              </span>
              <span className="text-muted-foreground text-[13px]">
                {detail.payments
                  .filter((p) => p.received_at)
                  .map((p) => tv("paidOn", { date: when(p.received_at!) }))
                  .join(" · ")}
              </span>
            </span>
          </section>
        ) : null}

        <PanelSection label={t("panel.lines")}>
          <dl className="border-hair border-t">
            {[...detail.lines]
              .sort((a, b) => a.sort - b.sort)
              .map((l, i) => (
                <div key={i} className="border-hair flex justify-between gap-3 border-b py-2.5">
                  <dt className="min-w-0 [overflow-wrap:anywhere]">
                    {l.kind === "accommodation" ? `${l.quantity} × ` : ""}
                    {l.label}
                  </dt>
                  <dd className="text-ink shrink-0 font-medium tabular-nums">
                    {fmt(l.amount_cents, detail.currency)}
                  </dd>
                </div>
              ))}
            <div className="text-ink flex justify-between pt-3 text-base font-extrabold">
              <dt>{t("total")}</dt>
              <dd className="tabular-nums">{fmt(detail.total_cents, detail.currency)}</dd>
            </div>
          </dl>
          {detail.promo_code ? (
            <p className="text-muted-foreground text-xs">
              {t("panel.promo")}: <span className="font-mono">{detail.promo_code}</span>
            </p>
          ) : null}
        </PanelSection>

        {/* Z71: the way to pay chosen in the cart and the company for the invoice. */}
        <PanelSection label={tv("payment.title")}>
          <div className="surface grid gap-1 px-3.5 py-3">
            <span className="text-ink">
              {tv(`payment.${detail.payment_method as "bank_transfer"}`)}
            </span>
            {detail.billing_company ? (
              <span className="grid gap-0.5 text-[13px] [overflow-wrap:anywhere] text-[#5a6672]">
                <span className="text-ink font-medium">
                  {tv("payment.invoiceTo", { company: detail.billing_company })}
                </span>
                <span>
                  {[
                    detail.billing_company_id && `IČO ${detail.billing_company_id}`,
                    detail.billing_tax_id && `DIČ ${detail.billing_tax_id}`,
                    detail.billing_vat_id && `IČ DPH ${detail.billing_vat_id}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {detail.billing_address ? <span>{detail.billing_address}</span> : null}
              </span>
            ) : null}
          </div>
        </PanelSection>

        {/* What the client copies into their invoicing tool; the issued document is uploaded below (Z51). */}
        {detail.status === "cancelled" &&
        !detail.payments.some((p) => p.status === "received") ? null : (
          <InvoiceBasisSection
            tenantId={active.tenantId}
            reservationId={detail.id}
            locale={locale}
            invoiceUploaded={(documents ?? []).some((d) => d.kind === "invoice")}
          />
        )}

        {/* Modules for one reservation, e.g. the stay account of upsell (Z35). */}
        <ModuleSlot
          name="booking.detail.tabs"
          tenantId={active.tenantId}
          locale={locale}
          reservationId={detail.id}
        />

        <PanelSection label={tv("guestNote")}>
          <p className="surface px-3.5 py-3 leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
            {detail.guest_note || tv("noNote")}
          </p>
        </PanelSection>

        <PanelSection label={td("heading")}>
          {/* Documents of this reservation; the upload form is behind "+ Nahrať dokument" (rule 7). */}
          <DocumentsManager
            tenantId={active.tenantId}
            reservationId={detail.id}
            collapsed
            documents={(documents ?? []).map((d) => ({
              id: d.id,
              title: tr(d.title, locale),
              visibleWhen: d.visible_when,
              kind: d.kind,
            }))}
          />
          {/* Property documents this guest gets as well (edited at the property). */}
          <div className="surface grid gap-2 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-ink font-medium">
                {td("forAllGuests", { count: guestGets.length })}
              </span>
              <Link
                href={`/admin/properties/${detail.property_id}/documents`}
                className="text-ink text-sm underline-offset-4 hover:underline"
              >
                {td("editAtProperty")} →
              </Link>
            </div>
            {guestGets.length ? (
              <ul className="grid gap-1.5">
                {guestGets.map((d) => (
                  <li key={d.id} className="text-muted-foreground flex items-center gap-2">
                    <FileText className="size-4 shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{tr(d.title, locale)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PanelSection>

        <PanelSection label={tv("internalNote")}>
          {[...detail.notes]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((n) => (
              <div key={n.id} className="surface px-3.5 py-2.5">
                <p className="[overflow-wrap:anywhere] whitespace-pre-line">{n.body}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {n.author?.full_name ?? n.author?.email} · {when(n.created_at)}
                </p>
              </div>
            ))}
          <NoteForm id={detail.id} />
        </PanelSection>

        <div>
          <PanelCollapsible label={t("panel.history")} count={detail.history.length}>
            <ul className="grid gap-2.5">
              {[...detail.history]
                .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
                .map((h, i) => (
                  <li key={i} className="grid grid-cols-[12px_minmax(0,1fr)] gap-3">
                    <span className="mt-1.5 size-2 rounded-full bg-[#c9cdd2]" />
                    <span className="grid gap-px">
                      <span className="text-ink [overflow-wrap:anywhere]">
                        {h.from_status
                          ? `${statusLabel(h.from_status)} → ${statusLabel(h.to_status)}`
                          : tv("created", { status: statusLabel(h.to_status) })}
                        {h.actor
                          ? ` — ${h.actor.full_name ?? h.actor.email}`
                          : ` — ${t("panel.system")}`}
                        {h.reason === "payment_deadline_expired"
                          ? ` · ${t("panel.expired")}`
                          : h.reason === "cancellation_request_declined"
                            ? ` · ${t("panel.declined")}`
                            : h.reason
                              ? ` · ${h.reason}`
                              : ""}
                      </span>
                      <span className="text-xs text-[#5a6672]">{when(h.changed_at)}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </PanelCollapsible>
          {detail.consents.length > 0 ? (
            <PanelCollapsible label={t("panel.consents")} count={detail.consents.length}>
              <ul className="grid gap-1.5">
                {detail.consents.map((c) => (
                  <li key={c.kind} className="flex justify-between gap-3">
                    <span>{tv(`consents.${c.kind as "terms"}`)}</span>
                    <span className="text-muted-foreground">
                      {c.granted ? t("panel.granted") : t("panel.notGranted")}
                    </span>
                  </li>
                ))}
              </ul>
            </PanelCollapsible>
          ) : null}
        </div>
      </div>,
    ),
  };
}
