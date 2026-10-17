import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, CircleCheck, Download, Mail, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import {
  DateRangePill,
  FilterPills,
  ListSearch,
  Pagination,
  SortHeader,
} from "@/core/admin/data-list";
import { DocumentsManager } from "@/core/admin/documents";
import { PageHeader } from "@/core/admin/page-header";
import { parsePanel } from "@/core/admin/panel-param";
import {
  PanelCollapsible,
  PanelLink,
  PanelSection,
  PanelSummary,
  RecordPanel,
} from "@/core/admin/record-panel";
import { StatusPill } from "@/core/admin/status";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { CancelReservationButton, NoteForm, ReservationActions } from "./panel-actions";
import {
  getReservationDetail,
  queryReservations,
  reservationListParams,
  SOURCES,
  statusCounts,
  type ReservationStatus,
} from "./query";
import { ExtendDueButton, MarkPaidButton } from "./quick-actions";

const PILL_STATUSES = ["pending_payment", "confirmed", "completed", "cancelled"] as const;

/** 03 Reservations (vizuál administrácie v1): state pills with counts, list, panel in two columns. */
export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const active = await requireTenant();
  const [t, tc, tv, td, locale, sp, tenant] = await Promise.all([
    getTranslations("reservations"),
    getTranslations("common"),
    getTranslations("adminV1.reservations"),
    getTranslations("documents"),
    getLocale(),
    searchParams,
    getTenantInfo(active.tenantId),
  ]);
  const params = reservationListParams(sp);
  const [{ rows, total }, counts] = await Promise.all([
    queryReservations(active.tenantId, params),
    statusCounts(active.tenantId, params),
  ]);
  const panel = parsePanel(sp.panel);
  const detail =
    panel?.type === "reservation" ? await getReservationDetail(active.tenantId, panel.id) : null;
  const documents = detail
    ? ((
        await (
          await createClient()
        )
          .from("documents")
          .select("id, title, visible_when")
          .eq("reservation_id", detail.id)
          .order("created_at")
      ).data ?? [])
    : [];
  const fmt = (cents: number, currency = tenant.currency) =>
    formatMoney(money(cents, currency), locale);
  const when = (iso: string) => formatDateTime(iso, locale, tenant.timezone, "short");
  const statusLabel = (s: string) => t(`statuses.${s as ReservationStatus}`);
  const sourceLabel = (s: string) => t(`sources.${s as (typeof SOURCES)[number]}`);
  const people = (r: { adults: number; children: number }) =>
    r.children
      ? tv("peopleWithChildren", { adults: r.adults, children: r.children })
      : t("panel.adults", { count: r.adults });
  const all = Object.values(counts).reduce((s, n) => s + n, 0);
  const exportQs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      typeof v === "string" && k !== "panel" ? [[k, v]] : [],
    ),
  ).toString();

  return (
    <div data-bleed>
      <PageHeader
        kicker={tenant.name}
        title={t("title")}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/reservations/export${exportQs ? `?${exportQs}` : ""}`} download>
                <Download /> {tc("exportCsv")}
              </a>
            </Button>
            <Button asChild className="font-bold">
              <Link href="/admin/reservations/new">
                <Plus /> {t("new")}
              </Link>
            </Button>
          </>
        }
      />
      <div className="border-line flex flex-wrap items-center gap-2.5 border-b px-5 pb-[18px] md:px-10">
        <ListSearch placeholder={tv("search")} className="w-full sm:w-72" />
        <FilterPills
          param="status"
          label={t("status")}
          options={[
            { value: "", label: tc("all"), count: all },
            ...PILL_STATUSES.map((s) => ({
              value: s,
              label: tv(`filters.${s}`),
              count: counts[s] ?? 0,
            })),
          ]}
        />
        <DateRangePill
          label={tv("arrival")}
          allLabel={tv("allDates")}
          fromLabel={t("filters.from")}
          toLabel={t("filters.to")}
          applyLabel={tv("apply")}
          clearLabel={tv("clear")}
        />
      </div>

      <div className="px-5 pb-14 md:px-10">
        <div className="overflow-x-auto">
          <div role="table" aria-label={t("title")} className="min-w-[760px]">
            <div
              role="row"
              className="border-line label-mono grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px_110px_150px] gap-4 border-b px-2 py-3"
            >
              <span role="columnheader">
                <SortHeader column="number">{t("number")}</SortHeader>
              </span>
              <span role="columnheader">{t("guest")}</span>
              <span role="columnheader">{tv("dates")}</span>
              <span role="columnheader">{tv("people")}</span>
              <span role="columnheader" className="text-right">
                <SortHeader column="total_cents">{tv("amount")}</SortHeader>
              </span>
              <span role="columnheader">{t("status")}</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">{tc("noResults")}</p>
            ) : (
              rows.map((r) => {
                const item = r.items[0];
                return (
                  <PanelLink
                    key={r.id}
                    type="reservation"
                    id={r.id}
                    role="row"
                    className="border-line grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px_110px_150px] items-center gap-4 border-b px-2 py-4 transition-colors hover:bg-[#fbfaf7]"
                  >
                    <span role="cell" className="text-ink font-mono text-[13px]">
                      {r.number}
                    </span>
                    <span role="cell" className="grid min-w-0 gap-0.5">
                      <span className="text-ink inline-flex items-center gap-1.5 truncate text-[15px] font-bold">
                        {r.cancellation_requested_at ? (
                          <AlertTriangle
                            className="size-4 shrink-0 text-[#c07a3e]"
                            aria-label={t("panel.cancelRequest")}
                          />
                        ) : null}
                        {r.guest_name}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">{sourceLabel(r.source)}</span>
                    </span>
                    <span role="cell" className="grid gap-0.5">
                      <span className="text-ink text-sm font-medium">
                        {item
                          ? `${formatDate(item.check_in, locale, "short")} – ${formatDate(item.check_out, locale, "short")}`
                          : ""}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">
                        {item
                          ? t("nights", { count: diffDays(item.check_in, item.check_out) })
                          : ""}
                      </span>
                    </span>
                    <span role="cell" className="text-sm font-normal">
                      {people(r)}
                    </span>
                    <span
                      role="cell"
                      className="text-ink text-right text-[15px] font-bold tabular-nums"
                    >
                      {fmt(r.total_cents, r.currency)}
                    </span>
                    <span role="cell">
                      <StatusPill status={r.status} label={statusLabel(r.status)} />
                    </span>
                  </PanelLink>
                );
              })
            )}
          </div>
        </div>
        <p className="mx-2 mt-4 text-[13px] text-[#5a6672]">{tv("portalNote")}</p>
        <div className="mt-6">
          <Pagination page={params.page} pageSize={params.pageSize} total={total} />
        </div>
      </div>

      {panel ? (
        <RecordPanel
          backLabel={t("title")}
          header={
            detail ? (
              <>
                <span className="text-ink font-mono text-[13px] font-medium">{detail.number}</span>
                <StatusPill status={detail.status} label={statusLabel(detail.status)} />
              </>
            ) : null
          }
          title={detail ? undefined : tc("detail")}
          label={detail ? `${detail.number} · ${detail.guest_name}` : undefined}
          actions={
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
            ) : undefined
          }
        >
          {detail ? (
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
                        detail.payment_due_at
                          ? tv("dueAt", { date: when(detail.payment_due_at) })
                          : null,
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
                      <div
                        key={i}
                        className="border-hair flex justify-between gap-3 border-b py-2.5"
                      >
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

              <PanelSection label={tv("guestNote")}>
                <p className="surface px-3.5 py-3 leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
                  {detail.guest_note || tv("noNote")}
                </p>
              </PanelSection>

              <PanelSection label={td("heading")}>
                <DocumentsManager
                  tenantId={active.tenantId}
                  reservationId={detail.id}
                  documents={documents.map((d) => ({
                    id: d.id,
                    title: tr(d.title, locale),
                    visibleWhen: d.visible_when,
                  }))}
                />
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
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{tc("noResults")}</p>
          )}
        </RecordPanel>
      ) : null}
    </div>
  );
}
