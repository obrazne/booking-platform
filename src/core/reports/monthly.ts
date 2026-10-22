import "server-only";
import { renderFormPdf } from "@/core/pdf/form-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MarketingRaw, MonthlyReportRaw, ReportView } from "./monthly-view";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * The numbers of a month (Z62, database `tenant_monthly_report` — the same revenue and occupancy as Štatistiky).
 * `asServer` for the e-mail worker (no user); otherwise the signed-in member (the database checks the client).
 * Z75: with `marketing` also the spend on own marketing and the sums since the first month (`tenant_marketing_budget`).
 */
export async function loadMonthlyReport(
  tenantId: string,
  month: string,
  asServer = false,
  marketing = true,
): Promise<MonthlyReportRaw> {
  const client = asServer ? createAdminClient() : await createClient();
  const { data, error } = await client.rpc("tenant_monthly_report", {
    p_tenant_id: tenantId,
    p_month: month,
  });
  if (error) throw new Error(error.message);
  const raw = data as unknown as MonthlyReportRaw;
  if (!marketing) return raw;
  const { data: mk, error: mkError } = await client.rpc("tenant_marketing_budget", {
    p_tenant_id: tenantId,
    p_from: raw.first_month ?? raw.month,
    p_month: month,
  });
  if (mkError) throw new Error(mkError.message);
  return { ...raw, marketing: mk as unknown as MarketingRaw };
}

/** The report as an A4 PDF (Geist) — the same content as the page; for the download, the accountant and the e-mail. */
export async function monthlyReportPdf(
  v: ReportView,
  tenantName: string,
  t: T,
): Promise<Uint8Array> {
  return renderFormPdf({
    title: `${t("title")} · ${v.monthLabel}`,
    subtitle: `${tenantName} · ${v.headline}`,
    sections: [
      {
        heading: v.monthLabel,
        rows: v.kpis.map((k) => [k.label, [k.value, k.delta, k.note].filter(Boolean).join(" · ")]),
      },
      {
        heading: t("savedTitle"),
        rows: [
          [v.budget.title, `${v.saved} — ${v.savedText}`],
          [t("spentLabel"), v.budget.spent ?? t("spentNone")],
          ...(v.budget.result ? [["", v.budget.result] as [string, string]] : []),
          ...(v.budget.total
            ? ([
                [
                  v.budget.total.label,
                  [
                    `${t("totalBudget")} ${v.budget.total.budget}`,
                    `${t("totalSpent")} ${v.budget.total.spent}`,
                    `${t(v.budget.total.balanceCents >= 0 ? "totalPlus" : "totalBalance")} ${v.budget.total.balance}`,
                  ].join(" · "),
                ],
              ] as [string, string][])
            : []),
          ...(v.directShare ? [[t("shareLabel"), v.directShare] as [string, string]] : []),
          [t("contactsLabel"), v.contacts],
        ],
      },
      {
        heading: t("workLabel"),
        rows: [
          ...v.work.map((w) => [w.what, `${w.time} · ${w.detail}`] as [string, string]),
          [v.workTitle, v.human],
        ],
      },
      {
        heading: v.channelsTitle,
        rows: [
          ...v.channels.map(
            (c) => [c.name, t("nightsCount", { count: c.nights })] as [string, string],
          ),
          [t("channel.free"), t("nightsCount", { count: v.freeNights })],
        ],
      },
      {
        heading: v.next.title,
        rows: [
          [v.next.revenue, v.next.detail],
          [t("weekendsLabel"), v.next.weekends],
          [t("waitingLabel"), v.next.waiting],
        ],
      },
    ],
    footer: v.note,
  });
}
