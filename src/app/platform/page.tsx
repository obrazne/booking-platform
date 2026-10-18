import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPills, ListSearch } from "@/core/admin/data-list";
import { PageHeader } from "@/core/admin/page-header";
import { loadTenants } from "@/core/admin/platform-data";
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

const STATUSES = ["active", "onboarding", "suspended"] as const;
const SHOW = ["trial_ending", "issues"] as const;

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
  const [list, { data: recent }, { data: badChannels }, { data: failed }] = await Promise.all([
    loadTenants(),
    // Counts only: tenant of each reservation, nothing about the guest.
    supabase.from("reservations").select("tenant_id").gte("created_at", daysAgo(30)),
    supabase
      .from("ical_channels")
      .select("tenant_id, last_status")
      .in("last_status", ["error", "conflict"]),
    supabase.from("email_outbox").select("tenant_id").eq("status", "failed"),
  ]);
  const perTenant = new Map<string, number>();
  for (const r of recent ?? []) perTenant.set(r.tenant_id, (perTenant.get(r.tenant_id) ?? 0) + 1);
  const trials = list.flatMap((x) =>
    x.tenant_modules.filter((m) => m.status === "trial" && m.trial_ends_at),
  );
  const nearestTrial = trials.map((m) => m.trial_ends_at!).sort()[0];
  const modules = listModules();
  const moduleLabel = (key: string) => {
    const m = modules.find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };
  const issues = (badChannels?.length ?? 0) + (failed?.length ?? 0);

  // Search and filters (Z57) over the clients — the numbers above stay for all of them.
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = one(sp.q).trim().toLocaleLowerCase();
  const status = STATUSES.find((x) => x === one(sp.status)) ?? "";
  const moduleKey = modules.some((m) => m.key === one(sp.module)) ? one(sp.module) : "";
  const show = SHOW.find((x) => x === one(sp.show)) ?? "";
  const soon = daysAgo(-14);
  const withIssue = new Set([
    ...(badChannels ?? []).map((c) => c.tenant_id),
    ...(failed ?? []).map((f) => f.tenant_id),
  ]);
  const matches = (x: (typeof list)[number], skip?: "status" | "module" | "show") => {
    const on = x.tenant_modules.filter((m) => m.status !== "off");
    const hay = [
      x.name,
      x.slug,
      x.owner?.email,
      x.owner?.full_name,
      ...x.tenant_domains.map((d) => d.hostname),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!q || hay.includes(q)) &&
      (skip === "status" || !status || x.status === status) &&
      (skip === "module" || !moduleKey || on.some((m) => m.module_key === moduleKey)) &&
      (skip === "show" ||
        !show ||
        (show === "issues"
          ? withIssue.has(x.id)
          : on.some((m) => m.status === "trial" && m.trial_ends_at && m.trial_ends_at <= soon)))
    );
  };
  const shown = list.filter((x) => matches(x));
  const count = (skip: "status" | "module" | "show", test: (x: (typeof list)[number]) => boolean) =>
    list.filter((x) => matches(x, skip) && test(x)).length;

  return (
    <div data-bleed>
      <PageHeader
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
            value={String(list.length)}
            note={tm("clientsNote", {
              onboarding: list.filter((x) => x.status === "onboarding").length,
            })}
          />
          <Stat
            label={tm("reservations30")}
            value={String(recent?.length ?? 0)}
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
            note={tm("systemNote", { sync: badChannels?.length ?? 0, emails: failed?.length ?? 0 })}
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
                  { value: "", label: tm("filterAll"), count: count("status", () => true) },
                  ...STATUSES.map((s) => ({
                    value: s,
                    label: t(`statuses.${s}`),
                    count: count("status", (x) => x.status === s),
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
                    count: count("show", (x) =>
                      x.tenant_modules.some(
                        (m) => m.status === "trial" && m.trial_ends_at && m.trial_ends_at <= soon,
                      ),
                    ),
                  },
                  {
                    value: "issues",
                    label: tm("withIssue"),
                    count: count("show", (x) => withIssue.has(x.id)),
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
                  count: count("module", (x) =>
                    x.tenant_modules.some(
                      (tm2) => tm2.module_key === m.key && tm2.status !== "off",
                    ),
                  ),
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
