import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auditLabel } from "@/core/admin/audit-label";
import { PageHeader } from "@/core/admin/page-header";
import { parsePanel } from "@/core/admin/panel-param";
import { loadTenants } from "@/core/admin/platform-data";
import {
  PanelCollapsible,
  PanelLink,
  PanelSection,
  PanelSummary,
  RecordPanel,
} from "@/core/admin/record-panel";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDate, formatDateTime } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { contrastRatio } from "@/core/theme/contrast";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
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
 * 05 Control center — Klienti (A4, vizuál administrácie v1.1): numbers across clients, clients with modules and
 * a one-column panel per client. Never guest names or contacts here — only counts.
 */
export default async function PlatformTenants({ searchParams }: PageProps<"/platform">) {
  if (!(await isPlatformAdmin())) return null;
  const [t, tm, tAll, locale, sp] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.platform"),
    getTranslations(),
    getLocale(),
    searchParams,
  ]);
  const ta = (await getTranslations("adminV1.audit")) as unknown as Parameters<
    typeof auditLabel
  >[0];
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
  const panel = parsePanel(sp.panel);
  const selected = panel?.type === "tenant" ? list.find((x) => x.id === panel.id) : undefined;
  const { data: audit } = selected
    ? await supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, data, created_at")
        .eq("tenant_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const issues = (badChannels?.length ?? 0) + (failed?.length ?? 0);

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
                          {x.owner ? (x.owner.full_name ?? x.owner.email) : tm("noOwner")}
                        </span>
                      </span>
                    </span>
                    <span role="cell" className="text-ink truncate font-mono text-[13px]">
                      {x.domain ?? "—"}
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
      </div>

      {panel ? (
        <RecordPanel
          backLabel={t("tenants")}
          label={selected?.name}
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
          title={selected ? undefined : tAll("common.detail")}
          actions={
            selected ? (
              <>
                {selected.domain ? (
                  <Button asChild variant="outline">
                    <a href={`https://${selected.domain}`} target="_blank" rel="noreferrer">
                      {tm("guestPage")} <ArrowUpRight />
                    </a>
                  </Button>
                ) : null}
                <a
                  href={`/platform/enter/${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-on-accent ml-auto inline-flex min-h-10 items-center gap-2 px-4 text-sm"
                >
                  {tm("openAdmin")} <ArrowUpRight className="size-4" />
                </a>
              </>
            ) : undefined
          }
        >
          {selected ? (
            <div className="grid gap-6 text-sm font-normal [&>*]:min-w-0">
              <PanelSummary
                title={selected.name}
                subtitle={
                  selected.domain ? (
                    <a
                      href={`https://${selected.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono hover:underline"
                    >
                      {selected.domain} ↗
                    </a>
                  ) : (
                    tm("noPublicDomain")
                  )
                }
                facts={[
                  {
                    label: tm("founded"),
                    value: formatDate(selected.created_at.slice(0, 10), locale),
                  },
                  {
                    label: tm("contact"),
                    value: selected.owner
                      ? (selected.owner.full_name ?? selected.owner.email)
                      : tm("noOwner"),
                  },
                  { label: tm("res30"), value: perTenant.get(selected.id) ?? 0 },
                  { label: tm("package"), value: tm("noPackage") },
                ]}
              />

              <PanelSection label={tm("packageModules")}>
                <div className="grid gap-2.5">
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
                {selected.people.length ? (
                  <ul className="border-hair border-t">
                    {selected.people.map((m, i) => (
                      <li
                        key={i}
                        className="border-hair flex flex-wrap justify-between gap-x-3 border-b py-2.5"
                      >
                        <span className="text-ink min-w-0 [overflow-wrap:anywhere]">
                          {m.profile?.full_name ? `${m.profile.full_name} · ` : ""}
                          {m.profile?.email}
                        </span>
                        <span className="text-muted-foreground">
                          {tAll(`team.roles.${m.role as "owner"}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{tm("noPeople")}</p>
                )}
              </PanelSection>

              <PanelSection label={tm("operation")}>
                <ul className="surface grid gap-2.5 px-4 py-3">
                  <li className="flex items-center gap-2.5">
                    <Dot
                      tone={
                        selected.domain && !selected.domain.endsWith(".vercel.app") ? "ok" : "off"
                      }
                    />
                    {tm("domain")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Dot
                      tone={(failed ?? []).some((f) => f.tenant_id === selected.id) ? "warn" : "ok"}
                    />
                    {tm("emails")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Dot
                      tone={
                        (badChannels ?? []).some((c) => c.tenant_id === selected.id) ? "warn" : "ok"
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
                  <div className="surface flex items-center gap-3 p-3">
                    <span
                      className="size-8 shrink-0 rounded-lg"
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
                    <Link
                      href={`/platform/tenants/${selected.id}`}
                      className="text-ink ml-auto text-sm font-medium underline underline-offset-4"
                    >
                      {tm("detail")}
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{tm("defaultTheme")}</p>
                )}
              </PanelSection>

              <div>
                <PanelCollapsible label={tm("recent")} count={audit?.length ?? 0}>
                  <ul className="grid gap-2">
                    {(audit ?? []).map((a) => (
                      <li key={a.id} className="grid gap-px">
                        <span className="text-ink">{auditLabel(ta, a, moduleLabel)}</span>
                        <span className="text-xs text-[#5a6672]">
                          {formatDateTime(a.created_at, locale, "Europe/Bratislava", "short")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </PanelCollapsible>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{tAll("common.noResults")}</p>
          )}
        </RecordPanel>
      ) : null}
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
