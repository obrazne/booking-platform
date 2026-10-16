import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireTenant } from "@/core/admin/action";
import { DataListToolbar, Pagination, SortHeader } from "@/core/admin/data-list";
import { parsePanel } from "@/core/admin/panel-param";
import { PanelLink, RecordPanel } from "@/core/admin/record-panel";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { NoteForm, ReservationActions } from "./panel-actions";
import {
  getReservationDetail,
  queryReservations,
  reservationListParams,
  SOURCES,
  STATUSES,
  type ReservationStatus,
} from "./query";

const STATUS_VARIANT: Record<
  ReservationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending_payment: "secondary",
  confirmed: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const active = await requireTenant();
  const [t, tc, locale, sp, tenant] = await Promise.all([
    getTranslations("reservations"),
    getTranslations("common"),
    getLocale(),
    searchParams,
    getTenantInfo(active.tenantId),
  ]);
  const params = reservationListParams(sp);
  const { rows, total } = await queryReservations(active.tenantId, params);
  const panel = parsePanel(sp.panel);
  const detail =
    panel?.type === "reservation" ? await getReservationDetail(active.tenantId, panel.id) : null;
  const fmt = (cents: number, currency = tenant.currency) =>
    formatMoney(money(cents, currency), locale);
  const when = (iso: string) => formatDateTime(iso, locale, tenant.timezone, "short");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/admin/reservations/new">
            <Plus /> {t("new")}
          </Link>
        </Button>
      </div>
      <DataListToolbar
        filters={[
          {
            param: "status",
            label: t("status"),
            options: STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
          },
          {
            param: "source",
            label: t("source"),
            options: SOURCES.map((s) => ({ value: s, label: t(`sources.${s}`) })),
          },
        ]}
        exportHref="/admin/reservations/export"
      />
      <form className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(sp).map(([k, v]) =>
          typeof v === "string" && !["from", "to", "page", "panel"].includes(k) ? (
            <input key={k} type="hidden" name={k} value={v} />
          ) : null,
        )}
        <label className="inline-flex items-center gap-2">
          {t("filters.from")}{" "}
          <Input type="date" name="from" defaultValue={params.from ?? ""} className="w-40" />
        </label>
        <label className="inline-flex items-center gap-2">
          {t("filters.to")}{" "}
          <Input type="date" name="to" defaultValue={params.to ?? ""} className="w-40" />
        </label>
        <Button type="submit" variant="outline" size="sm">
          {tc("search")}
        </Button>
      </form>

      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader column="number">{t("number")}</SortHeader>
              </TableHead>
              <TableHead>{t("guest")}</TableHead>
              <TableHead>{t("stay")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("source")}</TableHead>
              <TableHead className="text-right">
                <SortHeader column="total_cents">{t("total")}</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader column="created_at">{t("created")}</SortHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  {tc("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const item = r.items[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <PanelLink
                        type="reservation"
                        id={r.id}
                        className="font-mono font-medium hover:underline"
                      >
                        {r.number}
                      </PanelLink>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {r.cancellation_requested_at ? (
                          <AlertTriangle className="size-4 text-amber-600" />
                        ) : null}
                        {r.guest_name}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item
                        ? `${formatDate(item.check_in, locale, "short")} – ${formatDate(item.check_out, locale, "short")}`
                        : ""}
                      <span className="text-muted-foreground block text-xs">
                        {r.property?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status as ReservationStatus]}>
                        {t(`statuses.${r.status as ReservationStatus}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(`sources.${r.source as (typeof SOURCES)[number]}`)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(r.total_cents, r.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {when(r.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination page={params.page} pageSize={params.pageSize} total={total} />

      {panel ? (
        <RecordPanel
          title={detail ? `${detail.number} · ${detail.guest_name}` : tc("detail")}
          description={detail ? t(`statuses.${detail.status as ReservationStatus}`) : undefined}
        >
          {detail ? (
            <div className="grid gap-6 text-sm">
              {detail.cancellation_requested_at ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="font-medium">{t("panel.cancelRequest")}</p>
                  {detail.cancellation_request_note ? (
                    <p>
                      {t("panel.cancelRequestNote", { note: detail.cancellation_request_note })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <ReservationActions
                id={detail.id}
                status={detail.status}
                amountLabel={fmt(detail.total_cents, detail.currency)}
                hasRequest={Boolean(detail.cancellation_requested_at)}
              />

              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                <dt className="text-muted-foreground">{t("stay")}</dt>
                <dd>
                  {detail.items.map((i) => (
                    <span key={i.check_in}>
                      {formatDate(i.check_in, locale)} – {formatDate(i.check_out, locale)} ·{" "}
                      {t("nights", { count: diffDays(i.check_in, i.check_out) })}
                      <span className="text-muted-foreground block">
                        {detail.property?.name}
                        {i.unit && detail.items.length ? ` · ${i.unit.name}` : ""}
                      </span>
                    </span>
                  ))}
                </dd>
                <dt className="text-muted-foreground">{t("panel.guest")}</dt>
                <dd>{detail.guest_name}</dd>
                <dt className="text-muted-foreground">{t("panel.contact")}</dt>
                <dd>
                  <a
                    href={`mailto:${detail.guest_email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {detail.guest_email}
                  </a>
                  {detail.guest_phone ? <span className="block">{detail.guest_phone}</span> : null}
                </dd>
                <dt className="text-muted-foreground">{t("panel.people")}</dt>
                <dd>
                  {[
                    t("panel.adults", { count: detail.adults }),
                    detail.children ? t("panel.children", { count: detail.children }) : null,
                    detail.infants ? t("panel.infants", { count: detail.infants }) : null,
                    detail.pets ? t("panel.pets", { count: detail.pets }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
                <dt className="text-muted-foreground">{t("source")}</dt>
                <dd>{t(`sources.${detail.source as (typeof SOURCES)[number]}`)}</dd>
                {detail.promo_code ? (
                  <>
                    <dt className="text-muted-foreground">{t("panel.promo")}</dt>
                    <dd className="font-mono">{detail.promo_code}</dd>
                  </>
                ) : null}
                {detail.guest_note ? (
                  <>
                    <dt className="text-muted-foreground">{t("panel.note")}</dt>
                    <dd className="whitespace-pre-line">{detail.guest_note}</dd>
                  </>
                ) : null}
              </dl>

              <section className="grid gap-2">
                <h3 className="font-medium">{t("panel.lines")}</h3>
                <dl className="grid gap-1.5">
                  {[...detail.lines]
                    .sort((a, b) => a.sort - b.sort)
                    .map((l, i) => (
                      <div key={i} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {l.label}
                          {l.kind === "accommodation"
                            ? ` · ${l.quantity} × ${fmt(l.unit_amount_cents, detail.currency)}`
                            : ""}
                        </dt>
                        <dd className="tabular-nums">{fmt(l.amount_cents, detail.currency)}</dd>
                      </div>
                    ))}
                  <div className="border-border flex justify-between border-t pt-1.5 font-medium">
                    <dt>{t("total")}</dt>
                    <dd className="tabular-nums">{fmt(detail.total_cents, detail.currency)}</dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-1">
                <h3 className="font-medium">{t("panel.payment")}</h3>
                {detail.payments.map((p, i) => (
                  <p key={i} className="text-muted-foreground">
                    {t("panel.vs")} <span className="font-mono">{p.variable_symbol}</span> ·{" "}
                    {fmt(p.amount_cents, detail.currency)} ·{" "}
                    {p.received_at
                      ? `${t("panel.paidAt")} ${when(p.received_at)}`
                      : detail.payment_due_at
                        ? `${t("panel.due")} ${when(detail.payment_due_at)}`
                        : p.status}
                  </p>
                ))}
              </section>

              <section className="grid gap-2">
                <h3 className="font-medium">{t("panel.notes")}</h3>
                {[...detail.notes]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((n) => (
                    <div key={n.id} className="bg-muted/50 rounded-lg p-2.5">
                      <p className="whitespace-pre-line">{n.body}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {n.author?.full_name ?? n.author?.email} · {when(n.created_at)}
                      </p>
                    </div>
                  ))}
                <NoteForm id={detail.id} />
              </section>

              <section className="grid gap-1">
                <h3 className="font-medium">{t("panel.history")}</h3>
                <ul className="text-muted-foreground grid gap-1">
                  {[...detail.history]
                    .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
                    .map((h, i) => (
                      <li key={i}>
                        {when(h.changed_at)} ·{" "}
                        {h.from_status
                          ? `${t(`statuses.${h.from_status as ReservationStatus}`)} → `
                          : ""}
                        {t(`statuses.${h.to_status as ReservationStatus}`)} ·{" "}
                        {h.actor?.email ?? t("panel.system")}
                        {h.reason === "payment_deadline_expired"
                          ? ` · ${t("panel.expired")}`
                          : h.reason === "cancellation_request_declined"
                            ? ` · ${t("panel.declined")}`
                            : h.reason
                              ? ` · ${h.reason}`
                              : ""}
                      </li>
                    ))}
                </ul>
              </section>

              {detail.consents.length > 0 ? (
                <section className="grid gap-1">
                  <h3 className="font-medium">{t("panel.consents")}</h3>
                  <ul className="text-muted-foreground grid gap-1">
                    {detail.consents.map((c) => (
                      <li key={c.kind}>
                        {c.kind}: {c.granted ? t("panel.granted") : t("panel.notGranted")}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{tc("noResults")}</p>
          )}
        </RecordPanel>
      ) : null}
    </div>
  );
}
