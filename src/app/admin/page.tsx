import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { ModuleSlot } from "@/core/modules/module-slot";
import { todayIso } from "@/core/pricing/dates";
import { getActiveMembership } from "@/core/tenant/active";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  number: string;
  guest_name: string;
  total_cents: number;
  currency: string;
  payment_due_at: string | null;
};

function List({ rows, empty, extra }: { rows: Row[]; empty: string; extra?: (r: Row) => string }) {
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="grid gap-2 text-sm">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/admin/reservations?panel=reservation:${r.id}`}
            className="flex justify-between gap-3 hover:underline"
          >
            <span>
              <span className="font-mono">{r.number}</span> · {r.guest_name}
            </span>
            {extra ? <span className="text-muted-foreground">{extra(r)}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Owner's overview (B8): today's arrivals and departures, pending payments, cancellation requests. */
export default async function AdminDashboard() {
  const t = await getTranslations("admin");
  const tr = await getTranslations("reservations.dashboard");
  const active = await getActiveMembership();
  if (!active) return <p className="text-muted-foreground max-w-prose">{t("noMembership")}</p>;

  const [locale, tenant] = await Promise.all([getLocale(), getTenantInfo(active.tenantId)]);
  const today = todayIso(tenant.timezone);
  const supabase = await createClient();
  const select =
    "id, number, guest_name, total_cents, currency, payment_due_at, items:reservation_items!inner(check_in, check_out)";
  const [arrivals, departures, pending, requests] = await Promise.all([
    supabase
      .from("reservations")
      .select(select)
      .eq("tenant_id", tenant.id)
      .in("status", ["confirmed", "pending_payment", "in_progress"])
      .eq("items.check_in", today),
    supabase
      .from("reservations")
      .select(select)
      .eq("tenant_id", tenant.id)
      .in("status", ["confirmed", "in_progress"])
      .eq("items.check_out", today),
    supabase
      .from("reservations")
      .select(select)
      .eq("tenant_id", tenant.id)
      .eq("status", "pending_payment")
      .order("payment_due_at"),
    supabase
      .from("reservations")
      .select(select)
      .eq("tenant_id", tenant.id)
      .not("cancellation_requested_at", "is", null)
      .in("status", ["pending_payment", "confirmed"]),
  ]);
  const fmt = (r: Row) => formatMoney(money(r.total_cents, r.currency), locale);

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("dashboardTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{tr("arrivals")}</CardTitle>
          </CardHeader>
          <CardContent>
            <List rows={arrivals.data ?? []} empty={tr("none")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tr("departures")}</CardTitle>
          </CardHeader>
          <CardContent>
            <List rows={departures.data ?? []} empty={tr("none")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tr("pending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <List
              rows={pending.data ?? []}
              empty={tr("none")}
              extra={(r) =>
                `${fmt(r)}${r.payment_due_at ? ` · ${tr("dueIn", { date: formatDateTime(r.payment_due_at, locale, tenant.timezone, "short") })}` : ""}`
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tr("requests")}</CardTitle>
          </CardHeader>
          <CardContent>
            <List rows={requests.data ?? []} empty={tr("none")} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ModuleSlot name="admin.dashboard.cards" tenantId={active.tenantId} locale={locale} />
      </div>
    </div>
  );
}
