import { getTranslations } from "next-intl/server";
import {
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarRange,
  RefreshCw,
  CalendarOff,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { AdminShell, type ShellNavItem } from "@/core/admin/admin-shell";
import { TenantSwitcher, UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, getMemberships, isPlatformAdmin } from "@/core/auth/session";
import { getEnabledModules } from "@/core/modules/registry";
import { getActiveMembership } from "@/core/tenant/active";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations();
  const [user, memberships, active, admin] = await Promise.all([
    getCurrentUser(),
    getMemberships(),
    getActiveMembership(),
    isPlatformAdmin(),
  ]);

  const items: ShellNavItem[] = [];
  if (active) {
    items.push(
      { href: "/admin", label: t("nav.dashboard"), icon: <LayoutDashboard /> },
      { href: "/admin/reservations", label: t("nav.reservations"), icon: <BookOpenCheck /> },
      { href: "/admin/calendar", label: t("nav.calendar"), icon: <CalendarRange /> },
      { href: "/admin/properties", label: t("nav.properties"), icon: <Building2 /> },
      { href: "/admin/blocks", label: t("nav.blocks"), icon: <CalendarOff /> },
      { href: "/admin/ical", label: t("nav.ical"), icon: <RefreshCw /> },
    );
    for (const m of await getEnabledModules(active.tenantId)) {
      for (const nav of m.navItems ?? []) {
        const Icon = nav.icon;
        // Module labels live in the module's own namespace; key is checked when the module is written.
        const label = t(`${m.messages}.${nav.labelKey}` as Parameters<typeof t>[0]);
        items.push({ href: nav.href, label, icon: <Icon /> });
      }
    }
  }
  if (active) {
    items.push(
      { href: "/admin/team", label: t("nav.team"), icon: <Users /> },
      { href: "/admin/settings", label: t("nav.settings"), icon: <Settings /> },
    );
  }
  if (admin) items.push({ href: "/platform", label: t("nav.platform"), icon: <Shield /> });

  return (
    <AdminShell
      brand={{ icon: <CalendarCheck />, label: t("common.appName") }}
      items={items}
      topbar={
        <>
          {active ? (
            <TenantSwitcher
              tenants={memberships.map((m) => ({ id: m.tenantId, name: m.tenantName }))}
              activeId={active.tenantId}
            />
          ) : null}
          <UserMenu email={user?.email ?? null} />
        </>
      }
    >
      {children}
    </AdminShell>
  );
}
