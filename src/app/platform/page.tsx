import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPills, ListSearch, Pagination } from "@/core/admin/data-list";
import { PageHeader } from "@/core/admin/page-header";
import { readPaging } from "@/core/admin/paging";
import { TENANT_SHOW, TENANT_STATUSES, queryTenants } from "@/core/admin/platform-data";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDate } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TenantRows } from "./tenant-rows";

type TenantStatus = "onboarding" | "active" | "suspended";

/** Point in time n days back (the 30-day reservation count). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

const STATUSES = TENANT_STATUSES;
const SHOW = TENANT_SHOW;

/**
 * 05 Control center — Klienti (A4, vizuál administrácie v1.1): numbers across clients, clients with modules and
 * a one-column panel per client. Never guest names or contacts here — only counts. Z57: search (name, e-mail,
 * address) and filters (state, module, ending trial, problem); the row opens the client, the arrow its preview.
 */
export default async function PlatformTenants({ searchParams }: PageProps<"/platform">) {
  if (!(await isPlatformAdmin())) return null;
  const [t, tm, tAll, locale] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.platform"),
    getTranslations(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const sp = await searchParams;
  const paging = await readPaging(sp, "klienti");
  const modules = listModules();
  const moduleLabel = (key: string) => {
    const m = modules.find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const soon = daysAgo(-14);

  // Numbers across all clients — counts in the database, nothing loaded only to be counted (rule 7).
  const head = (table: "tenants" | "reservations") =>
    supabase.from(table).select("id", { count: "exact", head: true });
  const [clients, onboarding, recent, { data: trialRows }, { data: issueRows }] = await Promise.all(
    [
      head("tenants"),
      head("tenants").eq("status", "onboarding"),
      head("reservations").gte("created_at", daysAgo(30)),
      supabase
        .from("tenant_modules")
        .select("trial_ends_at")
        .eq("status", "trial")
        .not("trial_ends_at", "is", null)
        .order("trial_ends_at")
        .limit(1000),
      supabase.rpc("platform_issue_tenants"),
    ],
  );
  const trials = trialRows ?? [];
  const nearestTrial = trials[0]?.trial_ends_at;
  const badChannels = (issueRows ?? []).reduce((n, r) => n + Number(r.bad_channels), 0);
  const failed = (issueRows ?? []).reduce((n, r) => n + Number(r.failed_emails), 0);
  const issues = badChannels + failed;

  // Search and filters (Z57) — in SQL, one page of clients (Z63).
  const status = STATUSES.find((x) => x === one(sp.status)) ?? "";
  const moduleKey = modules.some((m) => m.key === one(sp.module)) ? one(sp.module) : "";
  const show = SHOW.find((x) => x === one(sp.show)) ?? "";
  const {
    rows: shown,
    total,
    counts,
  } = await queryTenants(
    {
      q: one(sp.q).trim().slice(0, 100),
      status,
      module: moduleKey,
      show,
      soon,
      issueIds: (issueRows ?? []).map((r) => r.tenant_id),
    },
    paging,
    modules.map((m) => m.key),
  );
  const { data: perRows } = shown.length
    ? await supabase.rpc("platform_reservation_counts", {
        p_since: daysAgo(30),
        p_tenants: shown.map((x) => x.id),
      })
    : { data: [] };
  const perTenant = new Map((perRows ?? []).map((r) => [r.tenant_id, Number(r.reservations)]));

  return (
    <div data-bleed>
      <PageHeader
        help="platformClients"
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={t("tenants")}
        actions={
          <Button asChild className="font-bold">
            <Link href="/platform/new">
              <Plus /> {t("create")}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-9 px-5 pb-14 md:px-10">
        <section
          aria-label={tm("numbers")}
          className="surface grid grid-cols-2 overflow-hidden lg:grid-cols-4"
        >
          <Stat
            label={tm("clients")}
            value={String(clients.count ?? 0)}
            note={tm("clientsNote", {
              onboarding: onboarding.count ?? 0,
            })}
          />
          <Stat
            label={tm("reservations30")}
            value={String(recent.count ?? 0)}
            note={tm("reservations30Note")}
            className="border-hair border-l"
          />
          <Stat
            label={tm("trials")}
            value={String(trials.length)}
            note={
              nearestTrial
                ? tm("trialsNote", { date: formatDate(nearestTrial.slice(0, 10), locale) })
                : "—"
            }
            className="border-hair border-t lg:border-t-0 lg:border-l"
          />
          <Stat
            label={tm("system")}
            value={issues === 0 ? tm("systemOk") : tm("systemWarn")}
            note={tm("systemNote", { sync: badChannels, emails: failed })}
            href="/platform/status"
            className="border-hair border-t border-l lg:border-t-0"
          />
        </section>

        <section className="grid gap-3">
          <div className="grid gap-3">
            <ListSearch placeholder={tm("search")} className="w-full max-w-md" />
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <FilterPills
                param="status"
                label={tm("filterStatus")}
                options={[
                  { value: "", label: tm("filterAll"), count: counts.all },
                  ...STATUSES.map((s) => ({
                    value: s,
                    label: t(`statuses.${s}`),
                    count: counts.status[s] ?? 0,
                  })),
                ]}
              />
              <FilterPills
                param="show"
                label={tm("filterShow")}
                options={[
                  { value: "", label: tm("filterNone") },
                  {
                    value: "trial_ending",
                    label: tm("trialEnding"),
                    count: counts.show.trial_ending ?? 0,
                  },
                  {
                    value: "issues",
                    label: tm("withIssue"),
                    count: counts.show.issues ?? 0,
                  },
                ]}
              />
            </div>
            <FilterPills
              param="module"
              label={tm("filterModule")}
              options={[
                { value: "", label: tm("filterAnyModule") },
                ...modules.map((m) => ({
                  value: m.key,
                  label: moduleLabel(m.key),
                  count: counts.module[m.key] ?? 0,
                })),
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <p className="text-muted-foreground py-6 text-sm">{tm("noMatch")}</p>
          ) : null}
          <TenantRows
            rows={shown.map((x) => {
              const on = x.tenant_modules.filter((m) => m.status !== "off");
              return {
                id: x.id,
                name: x.name,
                color: x.tenant_themes?.primary_color ?? "#2f5d50",
                owner: x.owner ? (x.owner.full_name ?? x.owner.email) : null,
                domain: x.domain,
                modules: on.map(
                  (m) =>
                    `${moduleLabel(m.module_key)}${m.status === "trial" ? ` (${t("moduleStatus.trial").toLowerCase()})` : ""}`,
                ),
                reservations30: perTenant.get(x.id) ?? 0,
                status: x.status as TenantStatus,
              };
            })}
          />
          {total > 0 ? (
            <Pagination page={paging.page} pageSize={paging.size} total={total} list="klienti" />
          ) : null}
          <p className="mx-2 text-[13px] text-[#5a6672]">{tm("privacyNote")}</p>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  href,
  className,
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="label-mono">{label}</span>
      <span className="text-ink text-2xl leading-none font-extrabold tracking-[-0.03em] xl:text-[32px]">
        {value}
      </span>
      <span className="text-muted-foreground text-[13px] font-normal">{note}</span>
    </>
  );
  return href ? (
    <Link
      href={href}
      className={cn("grid content-start gap-2 px-6 py-[22px] hover:bg-white/60", className)}
    >
      {body}
    </Link>
  ) : (
    <div className={cn("grid content-start gap-2 px-6 py-[22px]", className)}>{body}</div>
  );
}
