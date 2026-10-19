import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { formatDateTime } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";
import { RestoreButton } from "./restore-button";

/** Nastavenia › Nedávno zmazané (Z31): what the owner deleted in the last 30 days, restored with one click. */
export default async function TrashPage() {
  const active = await requireTenant();
  const [t, th, locale] = await Promise.all([
    getTranslations("history.trash"),
    getTranslations("history.tables"),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_trash", { p_tenant_id: active.tenantId });
  const rows = data ?? [];

  return (
    <div data-bleed>
      <PageHeader
        help="trash"
        breadcrumbs={await groupCrumbs("settings", t("title"), active.tenantId)}
        title={t("title")}
      />
      <PageBody className="grid gap-4">
        {error ? (
          <p className="text-muted-foreground">{t("ownerOnly")}</p>
        ) : rows.length ? (
          <ul className="surface overflow-hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="border-hair flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3.5 last:border-b-0"
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="label-mono">{th(r.table_name as Parameters<typeof th>[0])}</span>
                  <span className="text-ink truncate font-medium">{r.label}</span>
                  <span className="text-muted-foreground text-[13px]">
                    {t("deleted", {
                      date: formatDateTime(r.deleted_at, locale, "Europe/Bratislava", "short"),
                    })}
                    {r.deleted_by ? ` · ${t("by", { name: r.deleted_by })}` : ""}
                  </span>
                </span>
                <RestoreButton id={r.id} label={r.label} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}
      </PageBody>
    </div>
  );
}
