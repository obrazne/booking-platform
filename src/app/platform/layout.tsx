import { getTranslations } from "next-intl/server";
import { Building2, LayoutDashboard, Shield } from "lucide-react";
import { AdminShell } from "@/core/admin/admin-shell";
import { UserMenu } from "@/core/admin/topbar";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";
import { TourDialog } from "@/core/tours/tour-dialog";
import { tourIsNewForUser } from "@/core/tours/server";

/** Control center (A4): only for the platform admin. RLS enforces the same rule in the database. */
export default async function PlatformLayout({ children }: LayoutProps<"/platform">) {
  const t = await getTranslations();
  const [user, admin] = await Promise.all([getCurrentUser(), isPlatformAdmin()]);
  const tourNew = admin ? await tourIsNewForUser("admin") : false;

  return (
    <AdminShell
      brand={{ icon: <Shield />, label: t("platform.title") }}
      items={
        admin
          ? [
              { href: "/platform", label: t("platform.tenants"), icon: <Building2 /> },
              { href: "/admin", label: t("nav.dashboard"), icon: <LayoutDashboard /> },
            ]
          : []
      }
      topbar={<UserMenu email={user?.email ?? null} whatsNew={admin} />}
    >
      {admin ? children : <p className="text-muted-foreground">{t("platform.forbidden")}</p>}
      {admin ? <TourDialog tourKey="admin" autoOpen={tourNew} /> : null}
    </AdminShell>
  );
}
