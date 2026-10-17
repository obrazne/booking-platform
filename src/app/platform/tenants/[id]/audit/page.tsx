import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/core/format/format";
import { historyQuery, loadHistory, parseHistoryParams } from "@/core/history/load";
import { loadTenantDetail, TenantHeader } from "../tenant-header";
import { RevertButton } from "./revert-button";

/**
 * Client detail — Záznam zmien (Z31): every change in the client's data with "before → after" in words and
 * "Vrátiť túto zmenu". Filters: period, kind of record, person. The audit (sign-ins, modules) is one click away.
 */
export default async function TenantHistory({
  params,
  searchParams,
}: PageProps<"/platform/tenants/[id]/audit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tenant = await loadTenantDetail(id);
  const p = parseHistoryParams(sp);
  const [t, ta, tt, tf, to, ts, locale, history] = await Promise.all([
    getTranslations("history.page"),
    getTranslations("platform.auditPage"),
    getTranslations("history.tables"),
    getTranslations("history.fields"),
    getTranslations("history.ops"),
    getTranslations("history.sources"),
    getLocale(),
    loadHistory(id, parseHistoryParams(sp), tenant.currency),
  ]);
  const table = (key: string) => (tt.has(key as never) ? tt(key as never) : key);
  const field = (key: string) => (tf.has(key as never) ? tf(key as never) : key.replace(/_/g, " "));
  const base = `/platform/tenants/${tenant.id}/audit`;
  const control = "border-line bg-background text-ink min-h-10 rounded-full border px-3.5 text-sm";

  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="audit" />
      <div className="grid max-w-[1180px] gap-4 px-5 pt-6 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-prose text-sm">
          {t("intro")}{" "}
          <Link
            href={`/platform/audit?tenant=${tenant.id}`}
            className="text-ink font-medium underline underline-offset-4"
          >
            {t("auditLink")}
          </Link>
        </p>
        <form method="get" action={base} className="surface grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{ta("from")}</span>
              <input
                type="date"
                name="from"
                aria-label={ta("from")}
                defaultValue={p.from ?? ""}
                className={control}
              />
            </label>
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{ta("to")}</span>
              <input
                type="date"
                name="to"
                aria-label={ta("to")}
                defaultValue={p.to ?? ""}
                className={control}
              />
            </label>
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{t("kind")}</span>
              <select
                name="table"
                aria-label={t("kind")}
                defaultValue={p.table ?? ""}
                className={control}
              >
                <option value="">{ta("all")}</option>
                {history.tables.map((x) => (
                  <option key={x} value={x}>
                    {table(x)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[13px]">
              <span className="label-mono">{ta("person")}</span>
              <select
                name="actor"
                aria-label={ta("person")}
                defaultValue={p.actor ?? ""}
                className={control}
              >
                <option value="">{ta("allPeople")}</option>
                {history.people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="submit" className="font-bold">
              {ta("filter")}
            </Button>
            <Button asChild variant="ghost">
              <Link href={base}>{ta("reset")}</Link>
            </Button>
            <span className="text-muted-foreground ml-auto text-sm" role="status">
              {ta("count", { count: history.total })}
            </span>
          </div>
        </form>

        {history.entries.length ? (
          <ul className="surface overflow-hidden">
            {history.entries.map((e) => {
              const title = `${table(e.table)}${e.name ? ` · ${e.name}` : ""} — ${to(e.op)}`;
              return (
                <li
                  key={e.id}
                  className="border-hair grid gap-2 border-b px-4 py-3.5 text-sm last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-ink font-medium">{title}</span>
                    <span className="text-xs text-[#5a6672]">
                      {formatDateTime(e.at, locale, tenant.timezone, "short")} ·{" "}
                      {e.actor ?? ts(e.source)}
                      {e.actor && e.source === "guest" ? ` (${ts("guest")})` : ""}
                    </span>
                  </div>
                  {e.fields.length ? (
                    <dl className="grid gap-0.5 text-[13px]">
                      {e.fields.slice(0, 10).map((f) => (
                        <div key={f.field} className="flex flex-wrap gap-x-1.5">
                          <dt className="text-muted-foreground">{field(f.field)}:</dt>
                          <dd>
                            {e.op === "update" ? (
                              <>
                                <span className="line-through opacity-70">{f.before}</span> →{" "}
                                {f.after}
                              </>
                            ) : e.op === "insert" ? (
                              f.after
                            ) : (
                              f.before
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <RevertButton id={e.id} summary={title} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}

        {history.pages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {ta("page", { page: history.page, pages: history.pages })}
            </span>
            <span className="flex gap-2">
              {history.page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={`${base}${historyQuery(p, { page: history.page - 1 })}`}>
                    {ta("previous")}
                  </Link>
                </Button>
              ) : null}
              {history.page < history.pages ? (
                <Button asChild variant="outline">
                  <Link href={`${base}${historyQuery(p, { page: history.page + 1 })}`}>
                    {ta("next")}
                  </Link>
                </Button>
              ) : null}
            </span>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
