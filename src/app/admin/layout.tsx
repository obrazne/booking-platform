import { getTranslations } from "next-intl/server";
import {
  BookOpenCheck,
  CalendarCheck,
  CalendarOff,
  CalendarRange,
  House,
  LayoutDashboard,
  MessageSquareQuote,
  RefreshCw,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { AdminShell, type ShellNavItem } from "@/core/admin/admin-shell";
import { platformBrand } from "@/core/admin/brand";
import { TenantSwitcher, UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, getMemberships, isPlatformAdmin } from "@/core/auth/session";
import { getEnabledModules } from "@/core/modules/registry";
import { getActiveMembership } from "@/core/tenant/active";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { TourDialog } from "@/core/tours/tour-dialog";
import { tourIsNewForUser } from "@/core/tours/server";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations();
  const [user, memberships, active, admin] = await Promise.all([
    getCurrentUser(),
    getMemberships(),
    getActiveMembership(),
    isPlatformAdmin(),
  ]);
  const supabase = await createClient();
  const [{ data: profile }, { count: waiting }] = await Promise.all([
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
  ]);

  const items: ShellNavItem[] = [];
  if (active) {
    items.push(
      { href: "/admin", label: t("nav.dashboard"), icon: <LayoutDashboard /> },
      {
        href: "/admin/reservations",
        label: t("nav.reservations"),
        icon: <BookOpenCheck />,
        badge: waiting ?? 0,
      },
      { href: "/admin/calendar", label: t("nav.calendar"), icon: <CalendarRange /> },
      { href: "/admin/properties", label: t("nav.properties"), icon: <House /> },
    );
    for (const m of await getEnabledModules(active.tenantId)) {
      for (const nav of m.navItems ?? []) {
        const Icon = nav.icon;
        // Module labels live in the module's own namespace; key is checked when the module is written.
        const label = t(`${m.messages}.${nav.labelKey}` as Parameters<typeof t>[0]);
        items.push({ href: nav.href, label, icon: <Icon /> });
      }
    }
    items.push(
      { href: "/admin/testimonials", label: t("nav.testimonials"), icon: <MessageSquareQuote /> },
      { href: "/admin/blocks", label: t("nav.blocks"), icon: <CalendarOff />, group: "occupancy" },
      { href: "/admin/ical", label: t("nav.ical"), icon: <RefreshCw />, group: "occupancy" },
      { href: "/admin/team", label: t("nav.team"), icon: <Users />, group: "bottom" },
      { href: "/admin/settings", label: t("nav.settings"), icon: <Settings />, group: "bottom" },
    );
  }
  if (admin) {
    items.push({ href: "/platform", label: t("nav.platform"), icon: <Shield />, group: "bottom" });
  }
  const tourNew = active ? await tourIsNewForUser("owner") : false;

  return (
    <AdminShell
      brand={{ icon: <CalendarCheck />, label: platformBrand.name }}
      picker={
        active ? (
          <TenantSwitcher
            tenants={memberships.map((m) => ({ id: m.tenantId, name: m.tenantName }))}
            activeId={active.tenantId}
          />
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
      mobileTitle={active?.tenantName ?? platformBrand.name}
      addHref={active ? "/admin/reservations/new" : undefined}
      addLabel={t("reservations.new")}
    >
      <ThemeStyle theme={DEFAULT_THEME} scope="page" />
      {children}
      {active ? <TourDialog tourKey="owner" autoOpen={tourNew} /> : null}
    </AdminShell>
  );
}
