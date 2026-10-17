import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/core/admin/breadcrumbs";
import { isTestAccount, publicDomain } from "@/core/admin/platform-data";
import { TabNav } from "@/core/admin/tab-nav";
import { isPlatformAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export type TenantTab = "overview" | "modules" | "theme" | "domains" | "people" | "audit";
type TenantStatus = "onboarding" | "active" | "suspended";

const TAB_PATH: Record<TenantTab, string> = {
  overview: "",
  modules: "/modules",
  theme: "/theme",
  domains: "/domains",
  people: "/people",
  audit: "/audit",
};

const STATUS_PILL: Record<TenantStatus, string> = {
  onboarding: "bg-[#f6ecdf] text-[#8a4a22]",
  active: "bg-primary text-primary-foreground",
  suspended: "bg-[#eef0f3] text-[#3b4652]",
};

/** One client of the control center for its detail pages (platform admin only; RLS decides the same). */
export const loadTenantDetail = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await isPlatformAdmin())) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, status, country, currency, timezone, created_at, tenant_domains(hostname, is_primary), tenant_modules(module_key, status, trial_ends_at), tenant_themes(*), memberships(user_id, role, created_at, profile:profiles(email, full_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return {
    ...data,
    domain: publicDomain(data.tenant_domains),
    people: data.memberships.filter((m) => !isTestAccount(m.profile?.email)),
  };
});

export type TenantDetail = Awaited<ReturnType<typeof loadTenantDetail>>;

/** Header of a client's detail (v1.2): breadcrumbs, name and status, actions, tabs. */
export async function TenantHeader({ tenant, tab }: { tenant: TenantDetail; tab: TenantTab }) {
  const [t, tn, ts] = await Promise.all([
    getTranslations("platform.tabs"),
    getTranslations("platform.nav"),
    getTranslations("platform.snapshot"),
  ]);
  const tp = await getTranslations("platform");
  const base = `/platform/tenants/${tenant.id}`;
  const tabs = (Object.keys(TAB_PATH) as TenantTab[]).map((k) => ({
    href: `${base}${TAB_PATH[k]}`,
    label: t(k),
  }));
  return (
    <header className="grid gap-4 px-5 pt-6 md:px-10 md:pt-8">
      <Breadcrumbs
        label={tn("breadcrumbs")}
        items={[
          { label: tn("clients"), href: "/platform" },
          { label: tenant.name, href: base },
          ...(tab === "overview" ? [] : [{ label: t(tab) }]),
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="text-ink flex flex-wrap items-center gap-3 text-[28px] leading-tight font-extrabold tracking-[-0.03em] md:text-[32px]">
            {tenant.name}
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold tracking-normal",
                STATUS_PILL[tenant.status as TenantStatus],
              )}
            >
              {tp(`statuses.${tenant.status as TenantStatus}`)}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {tenant.slug} · {tenant.country} · {tenant.currency} · {tenant.timezone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {tenant.domain ? (
            <Button asChild variant="outline">
              <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer">
                {ts("guestPage")} <ArrowUpRight />
              </a>
            </Button>
          ) : null}
          <Button asChild className="font-bold">
            <a href={`/platform/enter/${tenant.id}`} target="_blank" rel="noreferrer">
              {ts("openAdmin")} <ArrowUpRight />
            </a>
          </Button>
        </div>
      </div>
      <TabNav tabs={tabs} label={tenant.name} />
    </header>
  );
}
