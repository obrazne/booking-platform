import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  not_started: "bg-[#eef0f3] text-[#3b4652]",
  in_progress: "bg-[#f6ecdf] text-[#8a4a22]",
  completed: "bg-primary text-primary-foreground",
};

function monthParam(v: unknown): string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
    ? v
    : new Date().toISOString().slice(0, 7);
}

/**
 * Rezervácie › Príchody (Z36): upcoming arrivals with the state of online check-in and of reports of foreigners
 * (deadline 5 days), and the monthly tax for accommodation for the municipality (CSV). Only with the module checkin.
 * A sub-item of Rezervácie — it is a view of reservations by arrival, like the calendar.
 */
export default async function ArrivalsPage({ searchParams }: PageProps<"/admin/arrivals">) {
  const active = await requireTenant();
  if (!(await isModuleEnabled(active.tenantId, "checkin"))) notFound();
  const [t, ts, locale, tenant, sp] = await Promise.all([
    getTranslations("modules.checkin.arrivals"),
    getTranslations("modules.checkin.section"),
    getLocale(),
    getTenantInfo(active.tenantId),
    searchParams,
  ]);
  const month = monthParam(sp.month);
  const supabase = await createClient();
  const [{ data: arrivals }, { data: tax }, { data: settings }] = await Promise.all([
    supabase.rpc("arrivals_overview", { p_tenant_id: active.tenantId, p_days: 30 }),
    supabase.rpc("city_tax_month", { p_tenant_id: active.tenantId, p_month: `${month}-01` }),
    supabase
      .from("tenant_settings")
      .select("city_tax_municipality, city_tax_cents")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const rate = settings?.city_tax_cents ?? 0;
  const paying = (tax ?? []).reduce((s, r) => s + r.paying, 0);
  const amount = (tax ?? []).reduce((s, r) => s + r.paying * r.nights * rate, 0);
  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="grid gap-8 px-5 pb-14 md:px-10">
        <section className="grid gap-3">
          <p className="text-muted-foreground max-w-prose text-sm">{t("lead")}</p>
          {arrivals?.length ? (
            <ul aria-label={t("title")} className="border-line border-t">
              {arrivals.map((a) => (
                <li key={a.reservation_id}>
                  <Link
                    href={`/admin/reservations?panel=reservation:${a.reservation_id}`}
                    className="border-line grid gap-x-4 gap-y-1 border-b px-2 py-3.5 transition-colors hover:bg-[#fbfaf7] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_90px_140px_minmax(0,1fr)] sm:items-center"
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-ink truncate text-[15px] font-bold">
                        {a.guest_name}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">
                        {a.number} · {a.property_name}
                      </span>
                    </span>
                    <span className="text-sm">
                      {formatDate(a.check_in, locale, "short")} –{" "}
                      {formatDate(a.check_out, locale, "short")}
                    </span>
                    <span className="text-sm">
                      {a.people ? `${a.people} / ${a.persons}` : a.persons}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
                          TONE[a.checkin_status] ?? TONE.not_started,
                        )}
                      >
                        {ts(`statuses.${a.checkin_status as "completed"}`)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "text-[13px]",
                        a.unreported && a.report_due < today
                          ? "font-semibold text-[#a8432f]"
                          : "text-[#5a6672]",
                      )}
                    >
                      {a.unreported
                        ? `${t("toReport", { count: a.unreported })} · ${ts(
                            a.report_due < today ? "reportOverdue" : "reportDue",
                            { date: formatDate(a.report_due, locale, "short") },
                          )}`
                        : a.foreigners
                          ? t("allReported")
                          : t("none")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground py-6 text-sm">{t("empty")}</p>
          )}
        </section>

        <section aria-labelledby="tax-title" className="surface grid gap-3 p-5">
          <h2 id="tax-title" className="text-ink text-base font-bold">
            {t("taxTitle")}
          </h2>
          {settings?.city_tax_municipality && rate > 0 ? (
            <p className="text-muted-foreground max-w-prose text-sm">
              {t("taxLead", { municipality: settings.city_tax_municipality })}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">{t("taxNotSet")}</p>
          )}
          <form method="get" className="flex flex-wrap items-end gap-2.5">
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{t("month")}</span>
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="border-line bg-background text-ink min-h-10 rounded-full border px-3.5 text-sm"
              />
            </label>
            <Button type="submit" variant="outline">
              {t("show")}
            </Button>
            <Button asChild variant="outline">
              <a href={`/admin/arrivals/tax?month=${month}`} download>
                <Download /> {t("exportCsv")}
              </a>
            </Button>
          </form>
          <p className="text-ink text-sm font-semibold" role="status">
            {t("taxSummary", { stays: tax?.length ?? 0, paying, amount: fmt(amount) })}
          </p>
        </section>
      </div>
    </div>
  );
}
