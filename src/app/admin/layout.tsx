import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarCheck,
  ChartLine,
  Gift,
  House,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminShell, type ShellNavItem } from "@/core/admin/admin-shell";
import { platformBrand } from "@/core/admin/brand";
import { openCollisions } from "@/core/admin/collisions";
import { TenantSwitcher, UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, getMemberships, isPlatformAdmin } from "@/core/auth/session";
import { getEnabledModules } from "@/core/modules/registry";
import { helpHref } from "@/core/help/faqs";
import { loadAdminIndex } from "@/core/search/load";
import { SearchBox } from "@/core/search/search-box";
import type { NavGroupKey } from "@/core/modules/types";
import { getActiveMembership } from "@/core/tenant/active";
import { getGuestSiteUrl } from "@/core/tenant/info";
import { loadBell } from "@/core/notifications/actions";
import { NotificationBell } from "@/core/notifications/bell";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { TourDialog } from "@/core/tours/tour-dialog";
import { tourIsNewForUser } from "@/core/tours/server";
import { createClient } from "@/lib/supabase/server";

/** Installable app (Z33): manifest and the iPhone home-screen icon. */
export const metadata: Metadata = {
  manifest: "/pwa/admin",
  appleWebApp: { capable: true, title: platformBrand.name, statusBarStyle: "default" },
  icons: { apple: "/pwa/icon/180" },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations();
  const [user, memberships, active, admin] = await Promise.all([
    getCurrentUser(),
    getMemberships(),
    getActiveMembership(),
    isPlatformAdmin(),
  ]);
  const supabase = await createClient();
  const [{ data: profile }, { count: waiting }, { count: portalChannels }] = await Promise.all([
    user
      ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    active
      ? supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", active.tenantId)
          .eq("status", "pending_payment")
      : Promise.resolve({ count: 0 }),
    // Rezervácie › Z portálov only when a portal calendar is connected (Z58).
    active
      ? supabase
          .from("ical_channels")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", active.tenantId)
      : Promise.resolve({ count: 0 }),
  ]);

  // Side menu v1.2: groups with sub-items; modules join a group through their manifest.
  const items: ShellNavItem[] = [];
  const modules = active ? await getEnabledModules(active.tenantId) : [];
  let search: Awaited<ReturnType<typeof loadAdminIndex>> | null = null;
  if (active) {
    const { data: properties } = await supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", active.tenantId)
      .order("sort")
      .limit(2);
    const extra: Record<NavGroupKey, ShellNavItem[]> = {
      reservations: [],
      messages: [],
      property: [],
      offer: [],
      connections: [],
      settings: [],
    };
    for (const m of modules) {
      for (const nav of m.navItems ?? []) {
        // Module labels live in the module's own namespace; key is checked when the module is written.
        const label = t(`${m.messages}.${nav.labelKey}` as Parameters<typeof t>[0]);
        const badge = nav.badge ? await nav.badge(active.tenantId).catch(() => 0) : undefined;
        extra[nav.group].push({ href: nav.href, label, badge });
      }
    }
    const single = properties?.length === 1 ? `/admin/properties/${properties[0]!.id}` : null;
    // Z42: "Kolízie" once the client had a collision of calendars; the badge counts the open ones.
    const collisions = await openCollisions(active.tenantId);
    items.push(
      { href: "/admin", label: t("nav.dashboard"), icon: <LayoutDashboard /> },
      {
        label: t("nav.reservations"),
        icon: <BookOpenCheck />,
        badge: (waiting ?? 0) + collisions.open,
        children: [
          { href: "/admin/reservations", label: t("nav.list"), badge: waiting ?? 0 },
          { href: "/admin/calendar", label: t("nav.calendar") },
          { href: "/admin/blocks", label: t("nav.blocks") },
          ...(portalChannels ? [{ href: "/admin/portal-stays", label: t("nav.portalStays") }] : []),
          ...(collisions.any
            ? [{ href: "/admin/collisions", label: t("nav.collisions"), badge: collisions.open }]
            : []),
          ...extra.reservations,
        ],
      },
      // Modules' own group (Z46): Správy after Rezervácie, with the badge of what waits.
      ...(extra.messages.length
        ? [
            {
              label: t("nav.messages"),
              icon: <MessageCircle />,
              badge: extra.messages.reduce((sum, i) => sum + (i.badge ?? 0), 0),
              children: extra.messages,
            },
          ]
        : []),
      // One property: straight to its tabs. Several: the list first, the tabs are on each property.
      single
        ? {
            label: t("nav.property"),
            icon: <House />,
            children: [
              { href: single, label: t("nav.propertyData") },
              { href: `${single}/photos`, label: t("nav.photos") },
              { href: `${single}/pricing`, label: t("nav.pricing") },
              { href: `${single}/page`, label: t("nav.page") },
              { href: `${single}/documents`, label: t("nav.documents") },
              ...extra.property,
            ],
          }
        : { href: "/admin/properties", label: t("nav.properties"), icon: <House /> },
      {
        label: t("nav.offer"),
        icon: <Gift />,
        children: [...extra.offer, { href: "/admin/testimonials", label: t("nav.testimonials") }],
      },
      {
        label: t("nav.statistics"),
        icon: <ChartLine />,
        // Z62: Štatistiky › Mesačný výpis.
        children: [
          { href: "/admin/statistics", label: t("report.navOverview") },
          { href: "/admin/statistics/report", label: t("report.title") },
        ],
      },
      {
        label: t("nav.connections"),
        icon: <RefreshCw />,
        children: [{ href: "/admin/ical", label: t("nav.ical") }, ...extra.connections],
      },
      {
        label: t("nav.settings"),
        icon: <Settings />,
        section: "bottom",
        children: [
          { href: "/admin/settings", label: t("nav.general") },
          { href: "/admin/team", label: t("nav.team") },
          { href: "/admin/settings/notifications", label: t("nav.notifications") },
          { href: "/admin/settings/trash", label: t("nav.trash") },
          ...extra.settings,
        ],
      },
      // Z67: Pomoc at the bottom, next to "Čo je nové" of the user block.
      { href: "/admin/help", label: t("help.nav"), icon: <LifeBuoy />, section: "bottom" },
    );
    // Z67: the register of pages and settings and the questions of Pomoc for the search of the top bar.
    search = await loadAdminIndex({
      modules,
      property: single ? single.split("/").pop()! : null,
      portals: Boolean(portalChannels),
      collisions: collisions.any,
    });
  }
  if (admin) {
    items.push({
      href: "/platform",
      label: t("nav.platform"),
      icon: <Shield />,
      section: "bottom",
    });
  }
  // Questions of Pomoc lead to Pomoc with the question open.
  const searchHelp = (search?.help ?? []).map(({ id, title, where, terms }) => ({
    id,
    title,
    where,
    terms,
    href: helpHref(id),
  }));
  const tourNew = active ? await tourIsNewForUser("owner") : false;
  const [bell, guestUrl] = active
    ? await Promise.all([loadBell("tenant"), getGuestSiteUrl(active.tenantId)])
    : [null, null];
  const bellFor = (media: "mobile" | "desktop") =>
    bell ? (
      <NotificationBell
        scope="tenant"
        initial={bell}
        settingsHref="/admin/settings/notifications"
        media={media}
      />
    ) : null;

  return (
    <AdminShell
      brand={{ icon: <CalendarCheck />, label: platformBrand.name }}
      picker={
        active ? (
          <TenantSwitcher
            tenants={
              active.adminView
                ? [{ id: active.tenantId, name: active.tenantName }]
                : memberships.map((m) => ({ id: m.tenantId, name: m.tenantName }))
            }
            activeId={active.tenantId}
          />
        ) : undefined
      }
      banner={
        active?.adminView ? (
          // Platform admin inside a client's administration (A4): impossible to overlook.
          <div
            role="status"
            className="sticky top-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#2b3036] px-5 py-2.5 text-sm text-white md:px-10"
          >
            <Shield className="size-4 shrink-0" />
            <span>{t("adminV1.adminView.banner", { tenant: active.tenantName })}</span>
            <a href="/platform/leave" className="font-bold underline underline-offset-4">
              {t("adminV1.adminView.back")}
            </a>
          </div>
        ) : undefined
      }
      items={items}
      user={
        <UserMenu
          name={profile?.full_name ?? null}
          email={user?.email ?? null}
          whatsNew={Boolean(active)}
        />
      }
      topbar={
        active ? (
          <>
            {search ? (
              <SearchBox
                variant="desktop"
                scope="admin"
                pages={search.pages}
                help={searchHelp}
                helpHref="/admin/help"
              />
            ) : null}
            <div className="ml-auto flex items-center gap-2.5">
              {guestUrl ? (
                <Button asChild variant="outline">
                  <a href={guestUrl} target="_blank" rel="noreferrer">
                    {t("adminV1.overview.guestPage")} <ArrowUpRight />
                  </a>
                </Button>
              ) : null}
              {bellFor("desktop")}
              <Button asChild className="font-bold">
                <Link href="/admin/reservations/new">
                  <Plus /> {t("reservations.new")}
                </Link>
              </Button>
            </div>
          </>
        ) : undefined
      }
      mobileBell={bellFor("mobile")}
      mobileSearch={
        search ? (
          <SearchBox
            variant="mobile"
            scope="admin"
            pages={search.pages}
            help={searchHelp}
            helpHref="/admin/help"
          />
        ) : undefined
      }
      mobileTitle={active?.tenantName ?? platformBrand.name}
      addHref={active ? "/admin/reservations/new" : undefined}
      addLabel={t("reservations.new")}
    >
      <ThemeStyle theme={DEFAULT_THEME} scope="page" />
      {children}
      {active ? (
        <TourDialog tourKey="owner" autoOpen={tourNew} modules={modules.map((m) => m.key)} />
      ) : null}
    </AdminShell>
  );
}
