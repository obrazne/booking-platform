import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/core/format/format";
import { addDays, todayIso } from "@/core/pricing/dates";
import { LICENSE_DEFAULTS } from "@/core/licenses/basis";
import { loadLicenseBasis } from "@/core/licenses/load";
import { moduleCatalog } from "@/core/modules/catalog";
import { money } from "@/core/money/money";
import { monthParam, shiftMonth } from "@/core/reports/monthly-view";
import { createClient } from "@/lib/supabase/server";
import { loadTenantDetail, TenantHeader } from "../tenant-header";
import { LicenseForm } from "./license-form";

const euros = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");

/**
 * Client detail — Licencia (Z81, A10): the record of the contract (number = the number in the contract, package and
 * modules, properties, fees, start, the annual contract, the state by payments) and the basis of the invoice of a
 * month (monthly fee, 2 % of the turnover, the setup in the first month) as a PDF.
 */
export default async function TenantLicense({
  params,
  searchParams,
}: PageProps<"/platform/tenants/[id]/license">) {
  const { id } = await params;
  const sp = await searchParams;
  const tenant = await loadTenantDetail(id);
  const [t, tc, locale] = await Promise.all([
    getTranslations("platform.license"),
    getTranslations("platform.catalog"),
    getLocale(),
  ]);
  const today = todayIso(tenant.timezone);
  const thisMonth = `${today.slice(0, 7)}-01`;
  // The last finished month by default — the one Martin invoices.
  const month = monthParam(sp.month) ?? shiftMonth(thisMonth, -1);
  const supabase = await createClient();
  const [basis, { data: properties }] = await Promise.all([
    loadLicenseBasis(tenant.id, month),
    supabase
      .from("properties")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("sort")
      .order("name"),
  ]);
  const license = basis?.license ?? null;
  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}T00:00:00Z`));
  const q = (m: string) => `/platform/tenants/${tenant.id}/license?month=${m.slice(0, 7)}`;
  const start = license?.starts_on ?? today;

  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="license" />
      <div className="grid max-w-[880px] gap-8 px-5 pt-6 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-prose text-sm">{t("intro")}</p>
        <section className="surface grid gap-4 p-6" aria-labelledby="license-form-title">
          <h2 id="license-form-title" className="text-ink text-lg font-bold">
            {license ? t("title", { number: license.number }) : t("new")}
          </h2>
          <LicenseForm
            tenantId={tenant.id}
            properties={properties ?? []}
            modules={moduleCatalog()
              .filter((m) => m.ready)
              .map((m) => ({ key: m.key, name: tc(`${m.key}.name` as Parameters<typeof tc>[0]) }))}
            values={{
              number: license?.number ?? "",
              package: (license?.package as "basic" | "carefree") ?? "basic",
              modules: license?.modules ?? [],
              property_ids: license?.property_ids ?? [],
              setup_fee: euros(license?.setup_fee_cents ?? LICENSE_DEFAULTS.setupFeeCents),
              monthly_fee: euros(
                license?.monthly_fee_cents ?? LICENSE_DEFAULTS.monthlyFeeCents.basic,
              ),
              percent: String((license?.turnover_bp ?? LICENSE_DEFAULTS.turnoverBp) / 100).replace(
                ".",
                ",",
              ),
              starts_on: start,
              contract_until: license?.contract_until ?? addDays(addDays(start, 365), -1),
              state: license?.state ?? "active",
              note: license?.note ?? "",
            }}
          />
        </section>

        {basis ? (
          <section className="surface grid gap-4 p-6" aria-labelledby="license-basis-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="license-basis-title" className="text-ink text-lg font-bold">
                {t("basisTitle", { month: monthLabel })}
              </h2>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="icon" aria-label={t("prev")}>
                  <Link href={q(shiftMonth(month, -1))}>
                    <ChevronLeft />
                  </Link>
                </Button>
                {month < thisMonth ? (
                  <Button asChild variant="outline" size="icon" aria-label={t("next")}>
                    <Link href={q(shiftMonth(month, 1))}>
                      <ChevronRight />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <a
                    href={`/platform/tenants/${tenant.id}/license/podklad?month=${month.slice(0, 7)}`}
                    download
                  >
                    <Download /> {t("pdf")}
                  </a>
                </Button>
              </div>
            </div>
            <dl className="border-hair grid border-t text-sm" data-testid="license-turnover">
              {(
                [
                  ["stays", basis.turnover.stays_cents],
                  ["orders", basis.turnover.orders_cents],
                  ["kept", basis.turnover.kept_cents],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="border-hair flex justify-between gap-3 border-b py-2">
                  <dt className="text-[#5a6672]">{t(`turnover.${k}`)}</dt>
                  <dd className="tabular-nums">{fmt(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-2 font-bold">
                <dt>{t("turnover.total")}</dt>
                <dd className="tabular-nums">{fmt(basis.turnover.total_cents)}</dd>
              </div>
            </dl>
            {basis.lines.length ? (
              <dl className="border-hair grid border-t text-sm" data-testid="license-basis">
                {basis.lines.map((l) => (
                  <div key={l.key} className="border-hair flex justify-between gap-3 border-b py-2">
                    <dt>
                      {t(`lines.${l.key}`, {
                        percent: (basis.license.turnover_bp / 100).toLocaleString(locale),
                        turnover: fmt(basis.turnover.total_cents),
                      })}
                    </dt>
                    <dd className="tabular-nums">{fmt(l.amountCents)}</dd>
                  </div>
                ))}
                <div className="text-ink flex justify-between gap-3 py-2 text-base font-extrabold">
                  <dt>{t("total")}</dt>
                  <dd className="tabular-nums">{fmt(basis.totalCents)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">{t("beforeStart")}</p>
            )}
            <p className="text-xs text-[#5a6672]">{t("basisNote")}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
