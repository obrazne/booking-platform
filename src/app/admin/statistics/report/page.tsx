import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { PageHeader } from "@/core/admin/page-header";
import { todayIso } from "@/core/pricing/dates";
import { loadMonthlyReport } from "@/core/reports/monthly";
import { monthParam, reportView, shiftMonth } from "@/core/reports/monthly-view";
import { NightsBar } from "@/core/reports/nights-bar";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AccountantButton } from "./accountant-button";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * Štatistiky › Mesačný výpis (Z62, doska 12, v1.4): one page like from the manager of an investment — how much the
 * owner earned directly, saved on commission, how much work the system did and what needed a person, where the nights
 * were sold and the outlook. The same numbers as Štatistiky; PDF and "Poslať účtovníkovi" with the same content.
 */
export default async function MonthlyReportPage({
  searchParams,
}: PageProps<"/admin/statistics/report">) {
  const active = await requireTenant();
  const [t, tn, locale, tenant, sp] = await Promise.all([
    getTranslations("report"),
    getTranslations("nav"),
    getLocale(),
    getTenantInfo(active.tenantId),
    searchParams,
  ]);
  const thisMonth = `${todayIso(tenant.timezone).slice(0, 7)}-01`;
  // The last complete month by default; the current one can be opened (still filling up).
  const wanted = monthParam(sp.month) ?? shiftMonth(thisMonth, -1);
  const month = wanted > thisMonth ? thisMonth : wanted;
  const raw = await loadMonthlyReport(tenant.id, month);
  const first = raw.first_month ?? month;
  const v = reportView(raw, t as unknown as T, locale, tenant.currency);
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("accountant_email")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  const prev = month > first ? shiftMonth(month, -1) : null;
  const next = month < thisMonth ? shiftMonth(month, 1) : null;
  const q = (m: string) => `/admin/statistics/report?month=${m.slice(0, 7)}`;

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={[
          { label: tn("statistics"), href: "/admin/statistics" },
          { label: t("title") },
        ]}
        title={
          <span className="grid gap-1">
            <span className="text-[13px] font-medium tracking-[0.12em] text-[#5a6672] uppercase">
              {t("kicker", { month: v.monthLabel })}
            </span>
            <span>{v.headline}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <nav
              aria-label={t("title")}
              className="border-line flex items-center rounded-full border bg-white"
            >
              {prev ? (
                <Link
                  href={q(prev)}
                  aria-label={t("prev")}
                  className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-full"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              ) : (
                <span
                  className="inline-flex size-10 items-center justify-center opacity-30"
                  aria-hidden
                >
                  <ChevronLeft className="size-4" />
                </span>
              )}
              <span className="text-ink min-w-32 px-1 text-center text-sm font-bold capitalize">
                {v.monthLabel}
              </span>
              {next ? (
                <Link
                  href={q(next)}
                  aria-label={t("next")}
                  className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-full"
                >
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  className="inline-flex size-10 items-center justify-center opacity-30"
                  aria-hidden
                >
                  <ChevronRight className="size-4" />
                </span>
              )}
            </nav>
            <Button asChild variant="outline">
              <a href={`/admin/statistics/report/pdf?month=${month.slice(0, 7)}`} download>
                <Download /> {t("pdf")}
              </a>
            </Button>
            <AccountantButton
              month={month.slice(0, 7)}
              email={settings?.accountant_email ?? null}
            />
          </div>
        }
      />
      <div className="grid gap-6 px-5 pb-14 md:px-10">
        <p className="text-muted-foreground text-sm">{t("sub", { tenant: tenant.name })}</p>

        <section
          aria-label={v.monthLabel}
          className="surface grid grid-cols-2 overflow-hidden lg:grid-cols-4"
        >
          {v.kpis.map((k, i) => (
            <div
              key={k.key}
              className={cn(
                "grid content-start gap-1.5 px-6 py-[22px]",
                i % 2 === 1 && "border-hair border-l",
                i >= 2 && "border-hair border-t lg:border-t-0",
                i === 2 && "lg:border-l",
              )}
            >
              <span className="label-mono">{k.label}</span>
              <span className="text-ink text-2xl leading-none font-extrabold tracking-[-0.03em] xl:text-[32px]">
                {k.value}
              </span>
              <span className="text-[13px] text-[#5a6672]">
                {k.delta ? <strong className="text-[#2b6a50]">{k.delta} </strong> : null}
                {k.note}
              </span>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="saved-title" className="surface grid content-start gap-3 p-6">
            <h2 id="saved-title" className="label-mono">
              {t("savedTitle")}
            </h2>
            <p className="text-primary text-[40px] leading-none font-extrabold tracking-[-0.03em]">
              {v.saved}
            </p>
            <p className="text-sm text-[#3b3d42]">{v.savedText}</p>
            <dl className="border-line grid border-t text-sm">
              <div className="border-line flex justify-between gap-3 border-b py-2.5">
                <dt className="text-[#5a6672]">{v.ytdLabel}</dt>
                <dd className="text-ink font-bold">{v.savedYtd}</dd>
              </div>
              {v.directShare ? (
                <div className="border-line flex justify-between gap-3 border-b py-2.5">
                  <dt className="text-[#5a6672]">{t("shareLabel")}</dt>
                  <dd className="text-ink font-bold">{v.directShare}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-[#5a6672]">{t("contactsLabel")}</dt>
                <dd className="text-ink font-bold">{v.contacts}</dd>
              </div>
            </dl>
            <Link
              href="/admin/settings"
              className="text-ink justify-self-start text-[13px] underline underline-offset-[3px]"
            >
              {t("commissionLink")}
            </Link>
          </section>

          <section aria-labelledby="work-title" className="surface grid content-start gap-3 p-6">
            <h2 id="work-title" className="label-mono">
              {t("workLabel")}
            </h2>
            <p className="text-ink text-xl font-extrabold tracking-tight">
              {v.work.length ? v.workTitle : t("workNone")}
            </p>
            {v.work.length ? (
              <ul className="border-line grid border-t">
                {v.work.map((w) => (
                  <li
                    key={w.key}
                    className="border-line grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b py-2.5"
                  >
                    <span className="text-ink text-sm font-bold">{w.what}</span>
                    <span className="text-ink row-span-2 text-sm tabular-nums">{w.time}</span>
                    <span className="text-[13px] text-[#5a6672]">{w.detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-[#3b3d42]">{v.human}</p>
            <p className="text-xs text-[#5a6672]">{t("workHint")}</p>
          </section>
        </div>

        <section aria-labelledby="channels-title" className="surface grid gap-3 p-6">
          <h2 id="channels-title" className="text-ink text-base font-bold">
            {v.channelsTitle}
          </h2>
          <p className="text-[13px] text-[#5a6672]">{t("channelsHint")}</p>
          <NightsBar
            view={v}
            freeLabel={t("channel.free")}
            nightsLabel={(count) => t("nightsCount", { count })}
          />
        </section>

        <section aria-labelledby="next-title" className="surface grid gap-5 p-6 md:grid-cols-3">
          <div className="grid content-start gap-1">
            <h2 id="next-title" className="label-mono">
              {v.next.title}
            </h2>
            <p className="text-ink text-xl font-extrabold">{v.next.revenue}</p>
            <p className="text-[13px] text-[#5a6672]">{v.next.detail}</p>
          </div>
          <div className="grid content-start gap-1">
            <h3 className="label-mono">{t("weekendsLabel")}</h3>
            <p className="text-ink text-sm font-bold">{v.next.weekends}</p>
            <p className="text-[13px] text-[#5a6672]">{t("weekendsHint")}</p>
          </div>
          <div className="grid content-start gap-1">
            <h3 className="label-mono">{t("waitingLabel")}</h3>
            <p className="text-ink text-sm font-bold">{v.next.waiting}</p>
            {v.next.waitingNone ? (
              <p className="text-[13px] text-[#5a6672]">{t("waitingNoneHint")}</p>
            ) : null}
          </div>
        </section>

        <p className="max-w-4xl text-xs text-[#5a6672]">{v.note}</p>
      </div>
    </div>
  );
}
