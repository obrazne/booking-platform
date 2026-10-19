"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { emailLayout, paragraph } from "@/core/email/layout";
import { sendEmail } from "@/core/email/send";
import { loadMonthlyReport, monthlyReportPdf } from "@/core/reports/monthly";
import { monthParam, reportView } from "@/core/reports/monthly-view";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

type T = (key: string, values?: Record<string, string | number>) => string;

/** "Poslať účtovníkovi" (Z62): the PDF of the month to the accountant's e-mail of Nastavenia → Mesačný výpis. */
export async function sendReportToAccountant(
  monthValue: string,
): Promise<{ ok: boolean; email?: string }> {
  const active = await requireTenant();
  const month = monthParam(monthValue);
  if (!month) return { ok: false };
  const supabase = await createClient();
  const [{ data: settings }, tenant, t, locale] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("accountant_email")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
    getTenantInfo(active.tenantId),
    getTranslations("report"),
    getLocale(),
  ]);
  const to = settings?.accountant_email;
  if (!to) return { ok: false };
  const v = reportView(
    await loadMonthlyReport(tenant.id, month),
    t as unknown as T,
    locale,
    tenant.currency,
  );
  const pdf = await monthlyReportPdf(v, tenant.name, t as unknown as T);
  const subject = `${t("title")} · ${v.monthLabel} · ${tenant.name}`;
  const result = await sendEmail({
    to,
    subject,
    fromName: tenant.name,
    html: emailLayout("#2f5d50", subject, [paragraph(v.headline), paragraph(v.note)]),
    text: [v.headline, v.note].join("\n\n"),
    attachments: [
      {
        filename: `vypis-${month.slice(0, 7)}.pdf`,
        content: Buffer.from(pdf).toString("base64"),
      },
    ],
  });
  return result.ok ? { ok: true, email: to } : { ok: false };
}
