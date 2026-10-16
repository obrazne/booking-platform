import { getTranslations } from "next-intl/server";
import { Building2, LayoutDashboard } from "lucide-react";
import { AdminShell } from "@/core/admin/admin-shell";
import { UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";

/** Control center (A4): only for the platform admin. RLS enforces the same rule in the database. */
export default async function PlatformLayout({ children }: LayoutProps<"/platform">) {
  const t = await getTranslations();
  const [user, admin] = await Promise.all([getCurrentUser(), isPlatformAdmin()]);

  return (
    <AdminShell
      brand={
        <span className="font-heading truncate text-sm font-semibold">{t("platform.title")}</span>
      }
      items={
        admin
          ? [
              { href: "/platform", label: t("platform.tenants"), icon: <Building2 /> },
              { href: "/admin", label: t("nav.dashboard"), icon: <LayoutDashboard /> },
            ]
          : []
      }
      topbar={<UserMenu email={user?.email ?? null} />}
    >
      {admin ? children : <p className="text-muted-foreground">{t("platform.forbidden")}</p>}
    </AdminShell>
  );
}
