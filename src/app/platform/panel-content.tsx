import "server-only";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auditLabel } from "@/core/admin/audit-label";
import { loadTenants } from "@/core/admin/platform-data";
import {
  PanelCollapsible,
  PanelSection,
  PanelSummary,
  type PanelContent,
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

/** Content of the client panel in the control center (Z26): only this client's data, in parallel. */
export async function tenantPanel(id: string): Promise<PanelContent> {
  const [t, tm, tAll, locale, admin] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.platform"),
    getTranslations(),
    getLocale(),
    isPlatformAdmin(),
  ]);
  if (!admin) return { body: null };
  const ta = (await getTranslations("adminV1.audit")) as unknown as Parameters<
    typeof auditLabel
  >[0];
  const supabase = await createClient();
  const [list, { count: res30 }, { data: badChannels }, { data: failed }, { data: audit }] =
    await Promise.all([
      loadTenants(),
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", id)
        .gte("created_at", daysAgo(30)),
      supabase
        .from("ical_channels")
        .select("tenant_id, last_status")
        .eq("tenant_id", id)
        .in("last_status", ["error", "conflict"]),
      supabase.from("email_outbox").select("tenant_id").eq("tenant_id", id).eq("status", "failed"),
      supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, data, created_at")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
  const selected = list.find((x) => x.id === id);
  if (!selected)
    return { body: <p className="text-muted-foreground text-sm">{tAll("common.noResults")}</p> };
  const perTenant = new Map([[id, res30 ?? 0]]);
  const modules = listModules();
  const moduleLabel = (key: string) => {
    const m = modules.find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };

  return {
    label: selected.name,
    header: selected ? (
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
          STATUS_PILL[selected.status as TenantStatus],
        )}
      >
        {t(`statuses.${selected.status as TenantStatus}`)}
      </span>
    ) : null,
    actions: selected ? (
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
    ) : undefined,
    body: (
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
                tone={selected.domain && !selected.domain.endsWith(".vercel.app") ? "ok" : "off"}
              />
              {tm("domain")}
            </li>
            <li className="flex items-center gap-2.5">
              <Dot tone={(failed ?? []).some((f) => f.tenant_id === selected.id) ? "warn" : "ok"} />
              {tm("emails")}
            </li>
            <li className="flex items-center gap-2.5">
              <Dot
                tone={(badChannels ?? []).some((c) => c.tenant_id === selected.id) ? "warn" : "ok"}
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
                  {selected.tenant_themes.primary_color} · {selected.tenant_themes.heading_font}
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
    ),
  };
}
