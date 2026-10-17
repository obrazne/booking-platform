import { getLocale, getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { auditLabel } from "@/core/admin/audit-label";
import { PageHeader } from "@/core/admin/page-header";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDateTime } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";

/** Control center — Audit: the latest changes across clients (who, what, when), in words. */
export default async function PlatformAudit() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tAll, locale] = await Promise.all([
    getTranslations("platform"),
    getTranslations(),
    getLocale(),
  ]);
  const ta = (await getTranslations("adminV1.audit")) as unknown as Parameters<
    typeof auditLabel
  >[0];
  const supabase = await createClient();
  const [{ data: audit }, { data: tenants }] = await Promise.all([
    supabase
      .from("audit_log")
      .select(
        "id, tenant_id, action, entity, entity_id, data, created_at, actor:profiles(email, full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("tenants").select("id, name"),
  ]);
  const tenantName = new Map((tenants ?? []).map((x) => [x.id, x.name]));
  const moduleLabel = (key: string) => {
    const m = listModules().find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };
  return (
    <div data-bleed>
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={t("audit")}
      />
      <div className="px-5 pb-14 md:px-10">
        {audit && audit.length ? (
          <ul className="surface overflow-hidden">
            {audit.map((a) => (
              <li
                key={a.id}
                className="border-hair grid gap-0.5 border-b px-4 py-3 text-sm last:border-b-0"
              >
                <span className="text-ink">
                  {auditLabel(ta, a, moduleLabel)}
                  {a.tenant_id ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {tenantName.get(a.tenant_id) ?? "—"}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-[#5a6672]">
                  {formatDateTime(a.created_at, locale, "Europe/Bratislava", "short")} ·{" "}
                  {a.actor?.full_name ?? a.actor?.email ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t("auditEmpty")}</p>
        )}
      </div>
    </div>
  );
}
