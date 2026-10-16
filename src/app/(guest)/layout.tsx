import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getGuestSettings } from "@/core/booking/catalog";
import { getTenantFromHost } from "@/core/tenant/current";
import { getTenantTheme } from "@/core/theme/load";
import { ThemeStyle } from "@/core/theme/theme-style";

// The booking page lives next to the client's own website and must not compete with it in search (A17).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GuestLayout({ children }: LayoutProps<"/">) {
  const tenant = await getTenantFromHost();
  if (!tenant) return <>{children}</>;
  const [theme, settings, t] = await Promise.all([
    getTenantTheme(tenant.id),
    getGuestSettings(tenant.id),
    getTranslations("guest.footer"),
  ]);
  return (
    <div
      data-tenant-theme
      className={`bg-brand-background text-foreground flex min-h-svh flex-col font-sans ${theme.colorMode === "dark" ? "dark" : ""}`}
    >
      <ThemeStyle theme={theme} />
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            {tenant.name}
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-border/60 text-muted-foreground border-t text-xs">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 sm:px-6">
          <span>© {tenant.name}</span>
          {settings.termsUrl ? (
            <a
              href={settings.termsUrl}
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              {t("terms")}
            </a>
          ) : null}
          {settings.privacyUrl ? (
            <a
              href={settings.privacyUrl}
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              {t("privacy")}
            </a>
          ) : null}
          <span className="ml-auto">{t("poweredBy")}</span>
        </div>
      </footer>
    </div>
  );
}
