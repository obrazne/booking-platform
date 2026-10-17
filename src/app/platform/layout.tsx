import { getTranslations } from "next-intl/server";
import { Activity, Building2, History, LayoutDashboard, Puzzle, Shield } from "lucide-react";
import { AdminShell } from "@/core/admin/admin-shell";
import { platformBrand } from "@/core/admin/brand";
import { UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { TourDialog } from "@/core/tours/tour-dialog";
import { tourIsNewForUser } from "@/core/tours/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Control center (A4): only for the platform admin, RLS enforces the same rule in the database. Its own menu without
 * the accommodation picker — it is Martin's place across clients (vizuál administrácie v1, 05).
 */
export default async function PlatformLayout({ children }: LayoutProps<"/platform">) {
  const t = await getTranslations();
  const [user, admin] = await Promise.all([getCurrentUser(), isPlatformAdmin()]);
  const tourNew = admin ? await tourIsNewForUser("admin") : false;
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
      items={
        admin
          ? [
              { href: "/platform", label: t("platform.tenants"), icon: <Building2 /> },
              { href: "/platform#modules", label: t("platform.modulesNav"), icon: <Puzzle /> },
              { href: "/platform#status", label: t("platform.statusNav"), icon: <Activity /> },
              { href: "/platform#audit", label: t("platform.auditNav"), icon: <History /> },
              {
                href: "/admin",
                label: t("platform.toAdmin"),
                icon: <LayoutDashboard />,
                group: "bottom",
              },
            ]
          : []
      }
      user={
        <UserMenu name={profile?.full_name ?? null} email={user?.email ?? null} whatsNew={admin} />
      }
      mobileTitle={t("platform.title")}
    >
      <ThemeStyle theme={DEFAULT_THEME} scope="page" />
      {admin ? children : <p className="text-muted-foreground p-8">{t("platform.forbidden")}</p>}
      {admin ? <TourDialog tourKey="admin" autoOpen={tourNew} /> : null}
    </AdminShell>
  );
}
