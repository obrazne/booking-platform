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

/**
 * Z75: "Koľko ste tento mesiac minuli na marketing" — saved per month (owner only, the database checks it);
 * an empty value removes the month's entry. Amount in euros ("1500", "1 500,50").
 */
export async function saveMarketingSpend(
  monthValue: string,
  amount: string,
): Promise<{ ok: boolean; error?: "invalid" | "failed" }> {
  const active = await requireTenant();
  const month = monthParam(monthValue);
  if (!month) return { ok: false, error: "invalid" };
  const text = amount.replace(/[\s\u00a0€]/g, "").replace(",", ".");
  const supabase = await createClient();
  if (text === "") {
    const { error } = await supabase
      .from("tenant_marketing_spend")
      .delete()
      .eq("tenant_id", active.tenantId)
      .eq("month", month);
    return error ? { ok: false, error: "failed" } : { ok: true };
  }
  const value = Number(text);
  if (!/^\d+(\.\d{1,2})?$/.test(text) || !Number.isFinite(value) || value > 1_000_000)
    return { ok: false, error: "invalid" };
  const { error } = await supabase.from("tenant_marketing_spend").upsert({
    tenant_id: active.tenantId,
    month,
    amount_cents: Math.round(value * 100),
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: "failed" } : { ok: true };
}
