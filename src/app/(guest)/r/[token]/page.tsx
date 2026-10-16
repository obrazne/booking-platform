import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { diffDays } from "@/core/pricing/dates";
import { payBySquareSvg } from "@/core/payments/pay-by-square";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { startAccountFromReservation } from "@/core/guest/auth";
import { CancelForm } from "./cancel-form";

type Summary = {
  id: string;
  tenant_id: string;
  number: string;
  status: "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled";
  guest_name: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  currency: string;
  total_cents: number;
  payment_due_at: string | null;
  cancellation_requested_at: string | null;
  check_in: string;
  check_out: string;
  property_name: string;
  lines: {
    kind: string;
    label: string;
    quantity: number;
    unit_amount_cents: number;
    amount_cents: number;
  }[];
  payment: { status: string; variable_symbol: string; amount_cents: number } | null;
  bank: { iban: string | null; account_holder: string | null; bic: string | null } | null;
};

/** Guest's reservation behind the secret access link (no account needed, B1/B7). */
export default async function ReservationPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const [t, locale, tenant] = await Promise.all([
    getTranslations("guest"),
    getLocale(),
    getTenantFromHost(),
  ]);
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("reservation_by_token", { p_token: token });
  const r = data as Summary | null;
  if (!r || (tenant && r.tenant_id !== tenant.id)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-muted-foreground">{t("reservation.notFound")}</p>
      </main>
    );
  }

  const fmt = (cents: number) => formatMoney(money(cents, r.currency), locale);
  const pending = r.status === "pending_payment";
  const qr =
    pending && r.bank?.iban && r.payment
      ? await payBySquareSvg({
          iban: r.bank.iban,
          bic: r.bank.bic,
          beneficiary: r.bank.account_holder ?? r.property_name,
          amountCents: r.total_cents,
          currency: r.currency,
          variableSymbol: r.payment.variable_symbol,
          note: `${r.property_name} ${r.number}`,
        }).catch(() => null)
      : null;

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("reservation.title", { number: r.number })}
          </h1>
          <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
            {t(`reservation.status.${r.status}`)}
          </Badge>
        </div>
        {pending ? (
          <p className="inline-flex items-center gap-2">
            <CheckCircle2 className="text-primary size-5" /> {t("reservation.thanks")}
          </p>
        ) : null}
        {r.status === "confirmed" ? <p>{t("reservation.paid")}</p> : null}
        <p className="text-muted-foreground text-sm">{t("reservation.keepLink")}</p>
      </div>

      {pending && r.payment ? (
        <section className="bg-card border-border grid gap-6 rounded-lg border p-6 sm:grid-cols-[1fr_200px]">
          <div className="grid content-start gap-3">
            <h2 className="font-heading text-xl font-semibold">{t("reservation.payTitle")}</h2>
            {r.payment_due_at ? (
              <p className="inline-flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                {t("reservation.payBy", {
                  date: formatDateTime(r.payment_due_at, locale, "Europe/Bratislava"),
                })}
              </p>
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("reservation.amount")}</dt>
              <dd className="text-base font-semibold tabular-nums">{fmt(r.total_cents)}</dd>
              <dt className="text-muted-foreground">{t("reservation.iban")}</dt>
              <dd className="font-mono">{r.bank?.iban?.replace(/(.{4})/g, "$1 ").trim()}</dd>
              <dt className="text-muted-foreground">{t("reservation.holder")}</dt>
              <dd>{r.bank?.account_holder}</dd>
              <dt className="text-muted-foreground">{t("reservation.vs")}</dt>
              <dd className="font-mono">{r.payment.variable_symbol}</dd>
            </dl>
          </div>
          {qr ? (
            <div className="grid content-start justify-items-center gap-2">
              <div
                role="img"
                aria-label={t("reservation.qrHint")}
                className="w-full max-w-[200px] rounded-xl bg-white p-2"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <p className="text-muted-foreground text-center text-xs">{t("reservation.qrHint")}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("reservation.stay")}</h2>
        <p>
          {r.property_name} · {formatDate(r.check_in, locale)} – {formatDate(r.check_out, locale)} ·{" "}
          {t("booking.nights", { count: diffDays(r.check_in, r.check_out) })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("reservation.guests")}: {r.adults + r.children}
          {r.infants ? ` + ${r.infants}` : ""}
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("reservation.breakdown")}</h2>
        <dl className="grid gap-2 text-sm">
          {r.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {l.label}
                {l.kind === "accommodation" ? ` · ${l.quantity} × ${fmt(l.unit_amount_cents)}` : ""}
              </dt>
              <dd className="tabular-nums">{fmt(l.amount_cents)}</dd>
            </div>
          ))}
          <div className="border-border flex justify-between border-t pt-2 text-base font-semibold">
            <dt>{t("booking.total")}</dt>
            <dd className="tabular-nums">{fmt(r.total_cents)}</dd>
          </div>
        </dl>
      </section>

      {r.status !== "cancelled" ? (
        <section className="bg-surface border-line grid gap-3 rounded-lg border p-6">
          <h2 className="font-heading text-ink text-xl font-bold">
            {t("account.saveDetailsTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("account.saveDetailsText")}</p>
          <form action={startAccountFromReservation.bind(null, token)}>
            <Button type="submit" variant="outline" className="rounded-full">
              {t("account.saveDetails")}
            </Button>
          </form>
        </section>
      ) : null}

      {r.status === "pending_payment" || r.status === "confirmed" ? (
        <section className="grid gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("reservation.cancelTitle")}</h2>
          {r.cancellation_requested_at ? (
            <p className="text-sm">{t("reservation.cancelRequested")}</p>
          ) : (
            <CancelForm token={token} />
          )}
        </section>
      ) : null}
    </main>
  );
}
