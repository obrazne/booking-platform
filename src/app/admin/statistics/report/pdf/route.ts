import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { loadMonthlyReport, monthlyReportPdf } from "@/core/reports/monthly";
import { monthParam, reportView } from "@/core/reports/monthly-view";
import { getTenantInfo } from "@/core/tenant/info";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "Stiahnuť PDF" of the monthly report (Z62): the same content as the page. */
export async function GET(req: Request) {
  const active = await requireTenant();
  const month = monthParam(new URL(req.url).searchParams.get("month"));
  if (!month) return new Response("Bad month", { status: 400 });
  const [t, locale, tenant] = await Promise.all([
    getTranslations("report"),
    getLocale(),
    getTenantInfo(active.tenantId),
  ]);
  const v = reportView(
    await loadMonthlyReport(tenant.id, month),
    t as unknown as T,
    locale,
    tenant.currency,
  );
  const pdf = await monthlyReportPdf(v, tenant.name, t as unknown as T);
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vypis-${month.slice(0, 7)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
