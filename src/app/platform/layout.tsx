import { getTranslations } from "next-intl/server";
import { Activity, Building2, History, Puzzle, Shield, Store } from "lucide-react";
import { AdminShell } from "@/core/admin/admin-shell";
import { platformBrand } from "@/core/admin/brand";
import { UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { TourDialog } from "@/core/tours/tour-dialog";
import { tourIsNewForUser } from "@/core/tours/server";
import { loadBell } from "@/core/notifications/actions";
import { NotificationBell } from "@/core/notifications/bell";
import { createClient } from "@/lib/supabase/server";

/**
 * Control center (A4): only for the platform admin, RLS enforces the same rule in the database. Its own menu without
 * the accommodation picker — it is Martin's place across clients (vizuál administrácie v1, 05).
 */
export default async function PlatformLayout({ children }: LayoutProps<"/platform">) {
  const t = await getTranslations();
  const [user, admin] = await Promise.all([getCurrentUser(), isPlatformAdmin()]);
  const tourNew = admin ? await tourIsNewForUser("admin") : false;
  const bell = admin ? await loadBell("platform") : null;
  const { data: tenants } = admin
    ? await (await createClient()).from("tenants").select("id, name").order("name")
    : { data: null };
  const { data: profile } = user
    ? await (
        await createClient()
      )
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <AdminShell
      brand={{ icon: <Shield />, label: platformBrand.name }}
      variant="control"
      tag={t("adminV1.control.tag")}
      items={
        admin
          ? [
              {
                label: t("platform.nav.clients"),
                icon: <Building2 />,
                children: [
                  { href: "/platform", label: t("platform.nav.allClients") },
                  { href: "/platform/new", label: t("platform.nav.newClient") },
                ],
              },
              {
                label: t("platform.nav.modules"),
                icon: <Puzzle />,
                children: [
                  { href: "/platform/modules", label: t("platform.nav.catalog") },
                  { href: "/platform/modules/trials", label: t("platform.nav.trials") },
                ],
              },
              { href: "/platform/status", label: t("platform.nav.status"), icon: <Activity /> },
              { href: "/platform/audit", label: t("platform.nav.audit"), icon: <History /> },
            ]
          : []
      }
      contextGroup={
        admin
          ? {
              prefix: "/platform/tenants/",
              names: Object.fromEntries((tenants ?? []).map((x) => [x.id, x.name])),
              tabs: [
                { path: "", label: t("platform.tabs.overview") },
                { path: "/modules", label: t("platform.tabs.modules") },
                { path: "/theme", label: t("platform.tabs.theme") },
                { path: "/domains", label: t("platform.tabs.domains") },
                { path: "/people", label: t("platform.tabs.people") },
                { path: "/audit", label: t("platform.tabs.audit") },
              ],
              icon: <Store />,
              after: 0,
            }
          : undefined
      }
      user={
        <UserMenu name={profile?.full_name ?? null} email={user?.email ?? null} whatsNew={admin} />
      }
      topbar={
        bell ? (
          <div className="ml-auto">
            <NotificationBell scope="platform" initial={bell} media="desktop" />
          </div>
        ) : undefined
      }
      mobileBell={bell ? <NotificationBell scope="platform" initial={bell} media="mobile" /> : null}
      mobileTitle={t("platform.title")}
    >
      <ThemeStyle theme={DEFAULT_THEME} scope="page" />
      {admin ? children : <p className="text-muted-foreground p-8">{t("platform.forbidden")}</p>}
      {admin ? <TourDialog tourKey="admin" autoOpen={tourNew} /> : null}
    </AdminShell>
  );
}
