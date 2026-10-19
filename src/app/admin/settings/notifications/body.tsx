import { getTranslations } from "next-intl/server";
import { Bell, Mail } from "lucide-react";
import { requireTenant } from "@/core/admin/action";
import { getEnabledModules } from "@/core/modules/registry";
import { TENANT_KINDS } from "@/core/notifications/types";
import { loadPushState } from "@/core/push/load";
import { PushSettings } from "@/core/push/push-settings";
import { DEFAULT_PUSH_KINDS } from "@/core/push/recipients";
import { createClient } from "@/lib/supabase/server";
import { ReportEmailSwitch } from "./report-email";

/**
 * Nastavenia › E-maily a upozornenia (v1.2, since Z69 a tab `?tab=upozornenia`): which events show in the bell and which come by e-mail too (read only), and
 * push notifications on this device (Z33, module `push`).
 */
export async function NotificationsBody() {
  const active = await requireTenant();
  const [t, tp] = await Promise.all([
    getTranslations("notifications.settings"),
    getTranslations("push"),
  ]);
  const supabase = await createClient();
  const [{ data: settings }, push] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("owner_notification_email, monthly_report_email")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
    loadPushState("tenant", active.tenantId),
  ]);
  // Kinds of a module (e.g. reviews) only when the module is on.
  const enabled = new Set((await getEnabledModules(active.tenantId)).map((m) => m.key));
  const kinds = TENANT_KINDS.filter((k) => !("module" in k) || enabled.has(k.module));

  return (
    <div className="grid gap-5">
      <ReportEmailSwitch initial={settings?.monthly_report_email ?? true} />
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
            {kinds.map((k) => (
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
      <section aria-labelledby="push-title" className="surface grid gap-3 p-5">
        <h2 id="push-title" className="text-ink text-base font-bold">
          {tp("title")}
        </h2>
        {!push.moduleOn ? (
          <p className="text-muted-foreground max-w-prose text-sm">{tp("moduleOff")}</p>
        ) : active.adminView ? (
          <p className="text-muted-foreground max-w-prose text-sm">{tp("adminView")}</p>
        ) : (
          <>
            <p className="text-muted-foreground max-w-prose text-sm">{tp("intro")}</p>
            <PushSettings
              scope="tenant"
              publicKey={push.publicKey}
              devices={push.devices}
              kindOptions={kinds.map((k) => ({
                kind: k.kind,
                label: t(`kinds.${k.kind}`),
              }))}
              defaultKinds={DEFAULT_PUSH_KINDS}
            />
          </>
        )}
      </section>
    </div>
  );
}
