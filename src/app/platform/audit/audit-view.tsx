import "server-only";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AUDIT_CATEGORIES,
  auditPeople,
  auditQuery,
  loadAudit,
  type AuditParams,
} from "@/core/admin/audit-query";
import { formatDateTime } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Audit with filters (control center v1.2): period, category, client, person, search; 50 per page; CSV export of
 * everything that matches. `tenantId` fixes the client (the client's "Záznam zmien" tab).
 */
export async function AuditView({
  params,
  basePath,
  tenantId,
}: {
  params: AuditParams;
  basePath: string;
  tenantId?: string;
}) {
  const p = tenantId ? { ...params, tenant: tenantId } : params;
  const [t, locale, result, people] = await Promise.all([
    getTranslations("platform.auditPage"),
    getLocale(),
    loadAudit(p),
    auditPeople(tenantId),
  ]);
  const { data: tenants } = tenantId
    ? { data: [] }
    : await (await createClient()).from("tenants").select("id, name").order("name");
  const field = "border-line bg-background text-ink min-h-10 rounded-full border px-3.5 text-sm";
  const csvHref = `/platform/audit/export${auditQuery(p)}`;

  return (
    <div className="grid gap-4">
      <form method="get" action={basePath} className="surface grid gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-[13px]">
            <span className="label-mono">{t("from")}</span>
            <input
              type="date"
              name="from"
              aria-label={t("from")}
              defaultValue={p.from ?? ""}
              className={field}
            />
          </label>
          <label className="grid gap-1 text-[13px]">
            <span className="label-mono">{t("to")}</span>
            <input
              type="date"
              name="to"
              aria-label={t("to")}
              defaultValue={p.to ?? ""}
              className={field}
            />
          </label>
          <label className="grid gap-1 text-[13px]">
            <span className="label-mono">{t("category")}</span>
            <select
              name="category"
              aria-label={t("category")}
              defaultValue={p.category ?? ""}
              className={field}
            >
              <option value="">{t("all")}</option>
              {(Object.keys(AUDIT_CATEGORIES) as (keyof typeof AUDIT_CATEGORIES)[]).map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          {tenantId ? null : (
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{t("client")}</span>
              <select
                name="tenant"
                aria-label={t("client")}
                defaultValue={p.tenant ?? ""}
                className={field}
              >
                <option value="">{t("allClients")}</option>
                {(tenants ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-[13px]">
            <span className="label-mono">{t("person")}</span>
            <select
              name="actor"
              aria-label={t("person")}
              defaultValue={p.actor ?? ""}
              className={field}
            >
              <option value="">{t("allPeople")}</option>
              {people.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] sm:col-span-2 lg:col-span-2">
            <span className="label-mono">{t("search")}</span>
            <input
              type="search"
              name="q"
              aria-label={t("search")}
              defaultValue={p.q}
              className={field}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" className="font-bold">
            {t("filter")}
          </Button>
          <Button asChild variant="ghost">
            <Link href={basePath}>{t("reset")}</Link>
          </Button>
          <span className="text-muted-foreground ml-auto text-sm" role="status">
            {t("count", { count: result.total })}
          </span>
          <Button asChild variant="outline">
            <a href={csvHref} download>
              <Download /> {t("csv")}
            </a>
          </Button>
        </div>
      </form>

      {result.rows.length ? (
        <ul className="surface overflow-hidden">
          {result.rows.map((a) => (
            <li
              key={a.id}
              className="border-hair grid gap-0.5 border-b px-4 py-3 text-sm last:border-b-0"
            >
              <span className="text-ink">
                {a.label}
                {!tenantId ? (
                  <span className="text-muted-foreground"> · {a.tenantName ?? t("noClient")}</span>
                ) : null}
              </span>
              <span className="text-xs text-[#5a6672]">
                {formatDateTime(a.at, locale, "Europe/Bratislava", "short")} ·{" "}
                {a.actor ?? t("system")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {result.pages > 1 ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {t("page", { page: result.page, pages: result.pages })}
          </span>
          <span className="flex gap-2">
            {result.page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`${basePath}${auditQuery(p, { page: result.page - 1 })}`}>
                  {t("previous")}
                </Link>
              </Button>
            ) : null}
            {result.page < result.pages ? (
              <Button asChild variant="outline">
                <Link href={`${basePath}${auditQuery(p, { page: result.page + 1 })}`}>
                  {t("next")}
                </Link>
              </Button>
            ) : null}
          </span>
        </nav>
      ) : null}
    </div>
  );
}
