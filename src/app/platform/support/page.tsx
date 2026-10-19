import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDown, Paperclip } from "lucide-react";
import { FilterPills, Pagination } from "@/core/admin/data-list";
import { formatDateTime } from "@/core/format/format";
import { CORE_FAQS } from "@/core/help/faqs";
import { listModules } from "@/core/modules/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DoneButton } from "./done-button";

const PAGE_SIZE = 20;

/**
 * Control center › Podpora (Z67): requests from "Nenašli ste odpoveď?" (newest first, collapsed rows, the picture
 * through a short signed link) and which guides of Pomoc do not help (answers "Nie").
 */
export default async function SupportPage({ searchParams }: PageProps<"/platform/support">) {
  const [t, th, locale, sp] = await Promise.all([
    getTranslations("platform.support"),
    getTranslations(),
    getLocale(),
    searchParams,
  ]);
  const status = sp.status === "done" ? "done" : sp.status === "all" ? "all" : "new";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("support_requests")
    .select(
      "id, message, page, user_email, user_name, user_agent, attachment_path, status, created_at, tenant_id, tenants(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  const [{ data: requests, count }, { data: stats }] = await Promise.all([
    query,
    supabase.rpc("help_feedback_stats"),
  ]);

  // Short links to the pictures (private bucket).
  const paths = (requests ?? []).map((r) => r.attachment_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await createAdminClient().storage.from("support-attachments").createSignedUrls(paths, 600)
    : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Question titles: the core and every module (also those a client switched off since).
  const titles = new Map<string, string>();
  const say = th as unknown as (key: string) => string;
  for (const f of CORE_FAQS) titles.set(f.id, say(`help.faqs.${f.id}.q`));
  for (const m of listModules())
    for (const f of m.helpFaqs ?? []) titles.set(f.id, say(`${m.messages}.help.${f.id}.q`));

  return (
    <div className="grid gap-8">
      <div className="grid gap-1.5">
        <h1 className="text-ink text-2xl font-extrabold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-prose text-sm">{t("intro")}</p>
      </div>

      <section aria-labelledby="requests-title" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="requests-title" className="text-ink text-lg font-bold">
            {t("requests")}
          </h2>
          <FilterPills
            param="status"
            label={t("status")}
            options={[
              { value: "", label: t("statusNew") },
              { value: "done", label: t("statusDone") },
              { value: "all", label: t("statusAll") },
            ]}
          />
        </div>
        {requests?.length ? (
          <ul className="surface overflow-hidden">
            {requests.map((r) => (
              <li key={r.id} className="border-hair border-b last:border-b-0">
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-[#faf9f6] [&::-webkit-details-marker]:hidden">
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-ink flex min-w-0 items-center gap-1.5 font-medium">
                        <span className="truncate">{r.message.split("\n")[0]}</span>
                        {r.attachment_path ? (
                          <Paperclip className="size-3.5 shrink-0" aria-label={t("picture")} />
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-[#5a6672]">
                        {r.tenants?.name ?? "—"} · {r.user_name || r.user_email}
                        {r.status === "done" ? ` · ${t("statusDone")}` : ""}
                      </span>
                    </span>
                    <span className="text-xs whitespace-nowrap text-[#5a6672]">
                      {formatDateTime(r.created_at, locale, "Europe/Bratislava", "short")}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="size-4 text-[#5a6672] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="grid gap-3 bg-[#faf9f6] px-4 pt-1 pb-4 text-[13px]">
                    <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
                      {r.message}
                    </p>
                    <dl className="grid gap-0.5 text-[#5a6672]">
                      <div className="flex flex-wrap gap-x-1.5">
                        <dt>{t("email")}:</dt>
                        <dd>
                          {r.user_email ? (
                            <a href={`mailto:${r.user_email}`} className="text-ink underline">
                              {r.user_email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-1.5">
                        <dt>{t("page")}:</dt>
                        <dd>{r.page ?? "—"}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-1.5">
                        <dt>{t("browser")}:</dt>
                        <dd className="break-all">{r.user_agent ?? "—"}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-3">
                      {r.attachment_path && urlOf.get(r.attachment_path) ? (
                        <a
                          href={urlOf.get(r.attachment_path) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink inline-flex items-center gap-1.5 font-medium underline"
                        >
                          <Paperclip className="size-3.5" /> {t("openPicture")}
                        </a>
                      ) : null}
                      {r.status === "new" ? <DoneButton id={r.id} label={t("markDone")} /> : null}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {(count ?? 0) > PAGE_SIZE ? (
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        ) : null}
      </section>

      <section aria-labelledby="guides-title" className="grid gap-3">
        <div className="grid gap-1">
          <h2 id="guides-title" className="text-ink text-lg font-bold">
            {t("guides")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("guidesHint")}</p>
        </div>
        {stats?.length ? (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs text-[#5a6672]">
                  <th className="px-4 py-2.5 font-medium">{t("question")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("yes")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("no")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.faq_id} className="border-hair border-t">
                    <td className="text-ink px-4 py-2.5">{titles.get(s.faq_id) ?? s.faq_id}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.yes}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${s.no > s.yes ? "text-destructive font-bold" : ""}`}
                    >
                      {s.no}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("guidesEmpty")}</p>
        )}
      </section>
    </div>
  );
}
