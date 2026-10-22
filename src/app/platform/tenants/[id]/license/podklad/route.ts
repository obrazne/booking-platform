import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatMoney } from "@/core/format/format";
import { loadLicenseBasis } from "@/core/licenses/load";
import { money } from "@/core/money/money";
import { renderFormPdf } from "@/core/pdf/form-pdf";
import { monthParam } from "@/core/reports/monthly-view";
import { createClient } from "@/lib/supabase/server";

/** Podklad na faktúru klientovi za mesiac (Z81) as a PDF — platform admin only; not a tax document. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/platform/tenants/[id]/license/podklad">,
) {
  const { id } = await params;
  const month = monthParam(new URL(request.url).searchParams.get("month"));
  if (!(await isPlatformAdmin()) || !z.uuid().safeParse(id).success || !month) notFound();
  const [basis, t, locale, { data: tenant }] = await Promise.all([
    loadLicenseBasis(id, month),
    getTranslations("platform.license"),
    getLocale(),
    (await createClient()).from("tenants").select("name, currency").eq("id", id).single(),
  ]);
  if (!basis || !tenant) notFound();
  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}T00:00:00Z`));
  const pdf = await renderFormPdf({
    title: t("basisTitle", { month: monthLabel }),
    subtitle: `${tenant.name} · ${t("title", { number: basis.license.number })} · ${t(`packages.${basis.license.package as "basic"}`)}`,
    sections: [
      {
        heading: t("turnover.title"),
        rows: [
          [t("turnover.stays"), fmt(basis.turnover.stays_cents)],
          [t("turnover.orders"), fmt(basis.turnover.orders_cents)],
          [t("turnover.kept"), fmt(basis.turnover.kept_cents)],
          [t("turnover.total"), fmt(basis.turnover.total_cents)],
        ],
      },
      {
        heading: t("linesTitle"),
        rows: [
          ...basis.lines.map(
            (l) =>
              [
                t(`lines.${l.key}`, {
                  percent: (basis.license.turnover_bp / 100).toLocaleString(locale),
                  turnover: fmt(basis.turnover.total_cents),
                }),
                fmt(l.amountCents),
              ] as [string, string],
          ),
          [t("total"), fmt(basis.totalCents)],
        ],
      },
    ],
    footer: t("basisNote"),
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="podklad-licencia-${basis.license.number}-${month.slice(0, 7)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
