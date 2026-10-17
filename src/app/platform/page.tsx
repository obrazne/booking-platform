import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";
import { PageHeader } from "@/core/admin/page-header";
import { parsePanel } from "@/core/admin/panel-param";
import { PanelColumns, PanelLink, PanelSection, RecordPanel } from "@/core/admin/record-panel";
import { formatDate, formatDateTime } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { contrastRatio } from "@/core/theme/contrast";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { openTenantAdmin } from "./actions";
import { ModuleSwitchForm } from "./forms";

type TenantStatus = "onboarding" | "active" | "suspended";
type ModuleStatus = "trial" | "active" | "off";

const STATUS_PILL: Record<TenantStatus, string> = {
  onboarding: "bg-[#f6ecdf] text-[#8a4a22]",
  active: "bg-primary text-primary-foreground",
  suspended: "bg-[#eef0f3] text-[#3b4652]",
};

/** Point in time n days back (the 30-day reservation count). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

function Dot({ tone }: { tone: "ok" | "off" | "warn" }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        tone === "ok" ? "bg-[#3f8f5a]" : tone === "warn" ? "bg-[#c07a3e]" : "bg-[#c9cdd2]",
      )}
    />
  );
}

/**
 * 05 Control center (A4, vizuál administrácie v1): numbers across clients, clients with modules and a panel per
 * client. Never guest names or contacts here — only counts.
 */
export default async function PlatformTenants({ searchParams }: PageProps<"/platform">) {
  if (!(await isPlatformAdmin())) return null;
  const [t, tm, locale, sp, user] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.platform"),
    getLocale(),
    searchParams,
    getCurrentUser(),
  ]);
  const tAll = await getTranslations();
  const supabase = await createClient();
  const since = daysAgo(30);
  const [
    { data: tenants },
    { data: recent },
    { data: badChannels },
    { count: failedEmails },
    { data: audit },
    { data: mine },
  ] = await Promise.all([
    supabase
      .from("tenants")
      .select(
        "id, name, slug, status, created_at, tenant_domains(hostname, is_primary), tenant_modules(module_key, status, trial_ends_at), tenant_themes(primary_color, heading_font, body_font, background_color), memberships(role, profile:profiles(email, full_name))",
      )
      .order("name"),
    // Counts only: tenant of each reservation, nothing about the guest.
    supabase.from("reservations").select("tenant_id").gte("created_at", since),
    supabase
      .from("ical_channels")
      .select("tenant_id, last_status")
      .in("last_status", ["error", "conflict"]),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("audit_log")
      .select("id, tenant_id, action, entity, created_at, actor:profiles(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(40),
    user
      ? supabase.from("memberships").select("tenant_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);
  const list = tenants ?? [];
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
  const domainOf = (x: (typeof list)[number]) =>
    (x.tenant_domains.find((d) => d.is_primary) ?? x.tenant_domains[0])?.hostname ?? null;
  const ownerOf = (x: (typeof list)[number]) => {
    const o = x.memberships.find((m) => m.role === "owner")?.profile;
    return o ? (o.full_name ?? o.email) : null;
  };
  const panel = parsePanel(sp.panel);
  const selected = panel?.type === "tenant" ? list.find((x) => x.id === panel.id) : undefined;
  const memberOf = new Set((mine ?? []).map((m) => m.tenant_id));
  const tenantName = new Map(list.map((x) => [x.id, x.name]));

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
          className="border-line grid grid-cols-2 overflow-hidden rounded-[10px] border lg:grid-cols-4"
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
            className="border-line border-l"
          />
          <Stat
            label={tm("trials")}
            value={String(trials.length)}
            note={
              nearestTrial
                ? tm("trialsNote", { date: formatDate(nearestTrial.slice(0, 10), locale) })
                : "—"
            }
            className="border-line border-t lg:border-t-0 lg:border-l"
          />
          <Stat
            id="status"
            label={tm("system")}
            value={
              (badChannels?.length ?? 0) + (failedEmails ?? 0) === 0
                ? tm("systemOk")
                : tm("systemWarn")
            }
            note={tm("systemNote", { sync: badChannels?.length ?? 0, emails: failedEmails ?? 0 })}
            className="border-line border-t border-l lg:border-t-0"
          />
        </section>

        <section className="grid gap-3">
          <div className="overflow-x-auto">
            <div role="table" aria-label={t("tenants")} className="min-w-[760px]">
              <div
                role="row"
                className="border-line label-mono grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_100px_130px] gap-4 border-b px-2 py-3"
              >
                <span role="columnheader">{tm("client")}</span>
                <span role="columnheader">{tm("address")}</span>
                <span role="columnheader">{tm("package")}</span>
                <span role="columnheader" className="text-right">
                  {tm("res30")}
                </span>
                <span role="columnheader">{t("status")}</span>
              </div>
              {list.map((x) => {
                const on = x.tenant_modules.filter((m) => m.status !== "off");
                return (
                  <PanelLink
                    key={x.id}
                    type="tenant"
                    id={x.id}
                    role="row"
                    className="border-line grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_100px_130px] items-center gap-4 border-b px-2 py-4 transition-colors hover:bg-[#fbfaf7]"
                  >
                    <span role="cell" className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-7 shrink-0 rounded-lg"
                        style={{ background: x.tenant_themes?.primary_color ?? "#2f5d50" }}
                      />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-ink truncate text-[15px] font-bold">{x.name}</span>
                        <span className="truncate text-[13px] text-[#5a6672]">
                          {ownerOf(x) ?? "—"}
                        </span>
                      </span>
                    </span>
                    <span role="cell" className="text-ink truncate font-mono text-[13px]">
                      {domainOf(x) ?? "—"}
                    </span>
                    <span role="cell" className="grid gap-0.5 text-sm">
                      <span className="text-ink font-medium">{tm("noPackage")}</span>
                      <span className="truncate text-[13px] text-[#5a6672]">
                        {on.length
                          ? on
                              .map(
                                (m) =>
                                  `${moduleLabel(m.module_key)}${m.status === "trial" ? ` (${t("moduleStatus.trial").toLowerCase()})` : ""}`,
                              )
                              .join(", ")
                          : tm("noModules")}
                      </span>
                    </span>
                    <span
                      role="cell"
                      className="text-ink text-right text-[15px] font-bold tabular-nums"
                    >
                      {perTenant.get(x.id) ?? 0}
                    </span>
                    <span role="cell">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                          STATUS_PILL[x.status as TenantStatus],
                        )}
                      >
                        {t(`statuses.${x.status as TenantStatus}`)}
                      </span>
                    </span>
                  </PanelLink>
                );
              })}
            </div>
          </div>
          <p className="mx-2 text-[13px] text-[#5a6672]">{tm("privacyNote")}</p>
        </section>

        <section id="modules" className="grid scroll-mt-6 gap-3">
          <h2 className="text-ink text-xl font-extrabold tracking-tight">{t("modules")}</h2>
          <div className="border-line border-t">
            {modules.map((m) => {
              const rows = list.flatMap((x) =>
                x.tenant_modules.filter((r) => r.module_key === m.key),
              );
              return (
                <div
                  key={m.key}
                  className="border-line flex justify-between gap-3 border-b py-3 text-sm"
                >
                  <span className="text-ink font-medium">{moduleLabel(m.key)}</span>
                  <span className="text-muted-foreground">
                    {tm("moduleCounts", {
                      active: rows.filter((r) => r.status === "active").length,
                      trial: rows.filter((r) => r.status === "trial").length,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section id="audit" className="grid scroll-mt-6 gap-3">
          <h2 className="text-ink text-xl font-extrabold tracking-tight">{t("audit")}</h2>
          {audit && audit.length ? (
            <ul className="border-line border-t">
              {audit.map((a) => (
                <li key={a.id} className="border-line grid gap-0.5 border-b py-2.5 text-sm">
                  <span className="text-ink">
                    {a.action} · {a.entity}
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
        </section>
      </div>

      {panel ? (
        <RecordPanel
          backLabel={t("tenants")}
          header={
            selected ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                  STATUS_PILL[selected.status as TenantStatus],
                )}
              >
                {t(`statuses.${selected.status as TenantStatus}`)}
              </span>
            ) : null
          }
          title={
            selected ? (
              <>
                {selected.name}
                <p className="text-muted-foreground mt-1 text-sm font-light tracking-normal">
                  {tm("since", { date: formatDate(selected.created_at.slice(0, 10), locale) })}
                </p>
              </>
            ) : (
              tAll("common.detail")
            )
          }
          actions={
            selected ? (
              <>
                {domainOf(selected) ? (
                  <a
                    href={`https://${domainOf(selected)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-on-accent inline-flex min-h-10 items-center gap-2 px-4 text-sm"
                  >
                    {tm("guestPage")} <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
                {memberOf.has(selected.id) ? (
                  <form action={openTenantAdmin.bind(null, selected.id)}>
                    <button
                      type="submit"
                      className="btn-on-accent inline-flex min-h-10 items-center px-4 text-sm"
                    >
                      {tm("openAdmin")}
                    </button>
                  </form>
                ) : null}
                <Button asChild variant="outline" className="ml-auto">
                  <Link href={`/platform/tenants/${selected.id}`}>{tm("detail")}</Link>
                </Button>
              </>
            ) : undefined
          }
        >
          {selected ? (
            <PanelColumns
              left={
                <>
                  <PanelSection label={tm("packageModules")}>
                    <p className="text-ink text-sm font-medium">{tm("noPackage")}</p>
                    <div className="grid gap-4">
                      {modules.map((m) => {
                        const row = selected.tenant_modules.find((x) => x.module_key === m.key);
                        return (
                          <ModuleSwitchForm
                            key={m.key}
                            tenantId={selected.id}
                            moduleKey={m.key}
                            label={moduleLabel(m.key)}
                            status={(row?.status ?? "off") as ModuleStatus}
                            trialEndsAt={row?.trial_ends_at ?? null}
                          />
                        );
                      })}
                    </div>
                    <p className="text-muted-foreground text-xs">{tm("offHides")}</p>
                  </PanelSection>
                  <PanelSection label={tm("people")}>
                    <ul className="border-line border-t text-sm">
                      {selected.memberships.map((m, i) => (
                        <li
                          key={i}
                          className="border-line flex justify-between gap-3 border-b py-2.5"
                        >
                          <span className="text-ink truncate">
                            {m.profile?.full_name ?? m.profile?.email ?? "—"}
                          </span>
                          <span className="text-muted-foreground">
                            {tAll(`team.roles.${m.role as "owner"}`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </PanelSection>
                </>
              }
              right={
                <>
                  <PanelSection label={tm("operation")}>
                    <ul className="grid gap-2.5 text-sm">
                      <li className="flex items-center gap-2.5">
                        <Dot
                          tone={
                            domainOf(selected) && !domainOf(selected)!.endsWith(".vercel.app")
                              ? "ok"
                              : "off"
                          }
                        />
                        {tm("domain")}:{" "}
                        <span className="font-mono text-[13px]">{domainOf(selected) ?? "—"}</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Dot tone={failedEmails ? "warn" : "ok"} />
                        {tm("emails")}
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Dot
                          tone={
                            (badChannels ?? []).some((c) => c.tenant_id === selected.id)
                              ? "warn"
                              : "ok"
                          }
                        />
                        {tm("sync")}
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Dot tone="off" />
                        {tm("payments")}
                      </li>
                    </ul>
                  </PanelSection>
                  <PanelSection label={tm("look")}>
                    {selected.tenant_themes ? (
                      <div className="border-line flex items-center gap-3 rounded-[10px] border p-3 text-sm">
                        <span
                          className="size-8 rounded-lg"
                          style={{ background: selected.tenant_themes.primary_color }}
                        />
                        <span className="grid gap-0.5">
                          <span className="text-ink font-mono text-[13px]">
                            {selected.tenant_themes.primary_color} ·{" "}
                            {selected.tenant_themes.heading_font}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {contrastRatio(
                              selected.tenant_themes.primary_color,
                              selected.tenant_themes.background_color,
                            ) >= 3
                              ? tm("contrastOk")
                              : tm("contrastLow")}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">{tm("defaultTheme")}</p>
                    )}
                  </PanelSection>
                  <PanelSection label={tm("recent")}>
                    <ul className="grid gap-2 text-sm">
                      {(audit ?? [])
                        .filter((a) => a.tenant_id === selected.id)
                        .slice(0, 5)
                        .map((a) => (
                          <li key={a.id} className="grid gap-px">
                            <span className="text-ink">
                              {a.action} · {a.entity}
                            </span>
                            <span className="text-xs text-[#5a6672]">
                              {formatDateTime(a.created_at, locale, "Europe/Bratislava", "short")}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </PanelSection>
                </>
              }
            />
          ) : (
            <p className="text-muted-foreground text-sm">{tAll("common.noResults")}</p>
          )}
        </RecordPanel>
      ) : null}
    </div>
  );
}

function Stat({
  id,
  label,
  value,
  note,
  className,
}: {
  id?: string;
  label: string;
  value: string;
  note: string;
  className?: string;
}) {
  return (
    <div id={id} className={cn("grid scroll-mt-6 content-start gap-2 px-6 py-[22px]", className)}>
      <span className="label-mono">{label}</span>
      <span className="text-ink text-2xl leading-none font-extrabold tracking-[-0.03em] xl:text-[32px]">
        {value}
      </span>
      <span className="text-muted-foreground text-[13px] font-normal">{note}</span>
    </div>
  );
}
