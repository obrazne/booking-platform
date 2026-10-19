import "server-only";
import { createTranslator } from "next-intl";
import { loadMonthlyReport, monthlyReportPdf } from "@/core/reports/monthly";
import { reportView } from "@/core/reports/monthly-view";
import messagesSk from "@/i18n/messages/sk.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMonthlyReportEmail } from "./monthly-report-email";
import type { OutgoingEmail } from "./send";

type T = (key: string, values?: Record<string, string | number>) => string;

/** For the e-mail worker: the report of a client's month to the owner (owner_notification_email, else the owner). */
export async function monthlyReportMail(
  tenantId: string,
  month: string,
): Promise<OutgoingEmail | null> {
  const admin = createAdminClient();
  const [{ data: tenant }, { data: settings }, { data: theme }, { data: owners }] =
    await Promise.all([
      admin.from("tenants").select("name, currency, default_locale").eq("id", tenantId).single(),
      admin
        .from("tenant_settings")
        .select("owner_notification_email, contact_name, monthly_report_email")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      admin.from("tenant_themes").select("primary_color").eq("tenant_id", tenantId).maybeSingle(),
      admin
        .from("memberships")
        .select("role, profile:profiles(email, full_name)")
        .eq("tenant_id", tenantId)
        .eq("role", "owner"),
    ]);
  if (!tenant || settings?.monthly_report_email === false) return null;
  const owner = (owners ?? [])[0]?.profile as { email?: string; full_name?: string } | null;
  const to = settings?.owner_notification_email ?? owner?.email ?? null;
  if (!to) return null;
  const t = createTranslator({
    locale: "sk",
    messages: messagesSk,
    namespace: "report",
  }) as unknown as T;
  const view = reportView(
    await loadMonthlyReport(tenantId, month, true),
    t,
    "sk",
    tenant.currency ?? "EUR",
  );
  const pdf = await monthlyReportPdf(view, tenant.name, t);
  const first = (settings?.contact_name ?? owner?.full_name ?? "").trim().split(/\s+/)[0] || null;
  return renderMonthlyReportEmail({
    view,
    t,
    accent: theme?.primary_color ?? "#2f5d50",
    tenantName: tenant.name,
    firstName: first,
    to,
    link: `${process.env.APP_URL ?? ""}/admin/statistics/report?month=${month.slice(0, 7)}`,
    pdf,
  });
}
