import { getTranslations } from "next-intl/server";
import { Bell, Mail } from "lucide-react";
import { requireTenant } from "@/core/admin/action";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { TENANT_KINDS } from "@/core/notifications/types";
import { createClient } from "@/lib/supabase/server";

/** Settings → E-maily a upozornenia (v1.2): which events show in the bell and which come by e-mail too (read only). */
export default async function NotificationSettingsPage() {
  const active = await requireTenant();
  const t = await getTranslations("notifications.settings");
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("owner_notification_email")
    .eq("tenant_id", active.tenantId)
    .maybeSingle();

  return (
    <div data-bleed>
      <PageHeader kicker={active.tenantName} title={t("title")} />
      <PageBody className="grid max-w-[880px] gap-5">
        <p className="text-muted-foreground max-w-prose">{t("intro")}</p>
        <div className="bg-card overflow-x-auto rounded-[10px] border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-5 py-3 font-medium">{t("kind")}</th>
                <th className="w-36 px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Bell className="size-3.5" aria-hidden /> {t("bell")}
                  </span>
                </th>
                <th className="w-36 px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden /> {t("email")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {TENANT_KINDS.map((k) => (
                <tr key={k.kind} className="border-line-hair border-b last:border-b-0">
                  <th scope="row" className="text-ink px-5 py-3 text-left font-medium">
                    {t(`kinds.${k.kind}`)}
                  </th>
                  <td className="px-5 py-3">{t("yes")}</td>
                  <td className="text-muted-foreground px-5 py-3">
                    {k.email === "yes"
                      ? t("yes")
                      : k.email === "expired"
                        ? t("onlyExpired")
                        : t("no")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-[13px]">
          {settings?.owner_notification_email
            ? t("emailTo", { email: settings.owner_notification_email })
            : t("emailToDefault")}
        </p>
      </PageBody>
    </div>
  );
}
