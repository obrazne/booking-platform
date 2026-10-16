import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDateTime } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { rowToTheme } from "@/core/theme/load";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { createClient } from "@/lib/supabase/server";
import { ModuleSwitchForm, TenantStatusForm } from "../../forms";

type ModuleStatus = "trial" | "active" | "off";
type TenantStatus = "onboarding" | "active" | "suspended";

export default async function TenantDetail({ params }: PageProps<"/platform/tenants/[id]">) {
  if (!(await isPlatformAdmin())) return null;
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, country, currency, timezone, tenant_domains(hostname, is_primary), tenant_modules(module_key, status, trial_ends_at), tenant_themes(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: audit } = await supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, data, created_at, actor:profiles(email)")
    .eq("tenant_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const theme = tenant.tenant_themes ? rowToTheme(tenant.tenant_themes) : DEFAULT_THEME;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        <p className="text-muted-foreground text-sm">
          {tenant.slug} · {tenant.country} · {tenant.currency} · {tenant.timezone}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("platform.status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantStatusForm tenantId={tenant.id} status={tenant.status as TenantStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("platform.domains")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {tenant.tenant_domains.map((d) => (
                <li key={d.hostname} className={d.is_primary ? "font-medium" : undefined}>
                  {d.hostname}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("platform.modules")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {listModules().map((m) => {
            const row = tenant.tenant_modules.find((x) => x.module_key === m.key);
            const label = t(`${m.messages}.title` as Parameters<typeof t>[0]);
            return (
              <ModuleSwitchForm
                key={m.key}
                tenantId={tenant.id}
                moduleKey={m.key}
                label={label}
                status={(row?.status ?? "off") as ModuleStatus}
                trialEndsAt={row?.trial_ends_at ?? null}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("platform.themePreview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeStyle theme={theme} />
          <div
            data-tenant-theme
            className="bg-brand-background grid gap-3 rounded-[var(--radius)] border p-6 font-sans"
          >
            <p className="font-heading text-2xl font-semibold">{tenant.name}</p>
            <p className="text-muted-foreground text-sm">{t("booking.placeholder")}</p>
            <div className="flex gap-2">
              <Button>{t("booking.checkAvailability")}</Button>
              <Button variant="outline">{t("common.cancel")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("platform.audit")}</CardTitle>
        </CardHeader>
        <CardContent>
          {audit && audit.length > 0 ? (
            <ul className="grid gap-2 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="grid gap-0.5">
                  <span>
                    <span className="font-medium">{a.action}</span>
                    {a.entity_id ? (
                      <span className="text-muted-foreground"> · {a.entity_id}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(a.created_at, locale, tenant.timezone)} ·{" "}
                    {a.actor?.email ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("platform.auditEmpty")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
