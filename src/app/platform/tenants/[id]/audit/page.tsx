import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { DateRangePill, FilterPills, Pagination } from "@/core/admin/data-list";
import { ParamSelect } from "@/core/admin/param-select";
import { formatDateTime } from "@/core/format/format";
import { formatRange } from "@/core/history/diff";
import { loadHistory, parseHistoryParams, type HistoryEntry } from "@/core/history/load";
import { loadTenantDetail, TenantHeader } from "../tenant-header";
import { RevertButton } from "./revert-button";

const PORTALS: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb" };
const PAGE_SIZE = 50;

/**
 * Client detail — Záznam zmien (Z31, Z64): every change in the client's data as one collapsed row (who · what · when),
 * a click opens "before → after" in words. The synchronisation of portal calendars is one summary per run and hidden
 * by default; filters apply at once. "Vrátiť túto zmenu" only for changes made by people.
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
    loadHistory(id, p, tenant.currency),
  ]);
  const table = (key: string) => (tt.has(key as never) ? tt(key as never) : key);
  const field = (key: string) => (tf.has(key as never) ? tf(key as never) : key.replace(/_/g, " "));
  const who = (e: HistoryEntry) =>
    e.actor ? `${e.actor}${e.source === "guest" ? ` (${ts("guest")})` : ""}` : ts(e.source);
  const syncTitle = (s: NonNullable<HistoryEntry["sync"]>) => {
    const parts = [
      s.added ? t("syncAdded", { count: s.added }) : null,
      s.removed ? t("syncRemoved", { count: s.removed }) : null,
      s.updated ? t("syncUpdated", { count: s.updated }) : null,
      s.conflicts ? t("syncConflicts", { count: s.conflicts }) : null,
    ].filter(Boolean);
    return t("syncSummary", {
      channel: PORTALS[s.source] ? `${PORTALS[s.source]} (${s.channel})` : s.channel,
      parts: parts.join(", "),
    });
  };

  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="audit" />
      <div className="grid gap-4 px-5 pt-6 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-prose text-sm">
          {t("intro")}{" "}
          <Link
            href={`/platform/audit?tenant=${tenant.id}`}
            className="text-ink font-medium underline underline-offset-4"
          >
            {t("auditLink")}
          </Link>
        </p>

        {/* Filters apply at once (rule 4). */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <DateRangePill
            label={t("period")}
            allLabel={t("allDates")}
            fromLabel={ta("from")}
            toLabel={ta("to")}
            applyLabel={t("apply")}
            clearLabel={t("clear")}
          />
          <FilterPills
            param="source"
            label={t("who")}
            options={[
              { value: "", label: t("whoAll") },
              { value: "user", label: t("whoUser") },
              { value: "guest", label: t("whoGuest") },
              { value: "system", label: t("whoSystem") },
            ]}
          />
          <FilterPills
            param="sync"
            label={t("sync")}
            options={[
              { value: "", label: t("syncHide") },
              { value: "1", label: t("syncShow") },
            ]}
          />
          <ParamSelect
            param="table"
            label={t("kind")}
            allLabel={t("allKinds")}
            options={history.tables.map((x) => ({ value: x, label: table(x) }))}
          />
          {history.people.length ? (
            <ParamSelect
              param="actor"
              label={ta("person")}
              allLabel={t("allPeople")}
              options={history.people.map((x) => ({ value: x.id, label: x.name }))}
            />
          ) : null}
          <span className="text-muted-foreground ml-auto text-sm" role="status">
            {ta("count", { count: history.total })}
          </span>
        </div>

        {history.entries.length ? (
          <ul className="surface overflow-hidden" aria-label={t("kind")}>
            {history.entries.map((e) => {
              const what = e.sync
                ? syncTitle(e.sync)
                : `${table(e.table)}${e.name ? ` · ${e.name}` : ""} — ${to(e.op)}`;
              const when = formatDateTime(e.at, locale, tenant.timezone, "short");
              return (
                <li key={e.id} className="border-hair border-b last:border-b-0">
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-[#faf9f6] [&::-webkit-details-marker]:hidden">
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-ink truncate font-medium">{what}</span>
                        <span className="truncate text-xs text-[#5a6672]">{who(e)}</span>
                      </span>
                      <span className="text-xs whitespace-nowrap text-[#5a6672]">{when}</span>
                      <ChevronDown
                        aria-hidden
                        className="size-4 text-[#5a6672] transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="grid gap-2 bg-[#faf9f6] px-4 pt-1 pb-4 text-[13px]">
                      {e.sync ? (
                        <ul className="grid gap-0.5">
                          {e.sync.events.map((ev, i) => {
                            const [bs, be] = ev.before?.split("|") ?? [];
                            return (
                              <li key={i}>
                                <span className="text-muted-foreground">
                                  {t(`syncEvent.${ev.op as "add"}`)}:
                                </span>{" "}
                                {formatRange(ev.start, ev.end)}
                                {ev.label ? ` · ${ev.label}` : ""}
                                {bs && be
                                  ? ` · ${t("syncWas", { range: formatRange(bs, be) })}`
                                  : ""}
                              </li>
                            );
                          })}
                        </ul>
                      ) : e.fields.length ? (
                        <dl className="grid gap-0.5">
                          {e.fields.slice(0, 20).map((f) => (
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
                      {e.revertable ? (
                        <RevertButton id={e.id} summary={what} />
                      ) : (
                        <p className="text-xs text-[#5a6672]">{t("noRevert", { who: who(e) })}</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}

        {history.total > PAGE_SIZE ? (
          <Pagination page={history.page} pageSize={PAGE_SIZE} total={history.total} />
        ) : null}
      </div>
    </div>
  );
}
