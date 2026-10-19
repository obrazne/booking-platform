import "server-only";
import { renderFormPdf } from "@/core/pdf/form-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyReportRaw, ReportView } from "./monthly-view";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * The numbers of a month (Z62, database `tenant_monthly_report` — the same revenue and occupancy as Štatistiky).
 * `asServer` for the e-mail worker (no user); otherwise the signed-in member (the database checks the client).
 */
export async function loadMonthlyReport(
  tenantId: string,
  month: string,
  asServer = false,
): Promise<MonthlyReportRaw> {
  const client = asServer ? createAdminClient() : await createClient();
  const { data, error } = await client.rpc("tenant_monthly_report", {
    p_tenant_id: tenantId,
    p_month: month,
  });
  if (error) throw new Error(error.message);
  return data as unknown as MonthlyReportRaw;
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
          [t("savedTitle"), `${v.saved} — ${v.savedText}`],
          [v.ytdLabel, v.savedYtd],
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
