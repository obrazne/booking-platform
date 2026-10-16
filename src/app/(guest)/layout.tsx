import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getGuestSettings } from "@/core/booking/catalog";
import { getTenantFromHost } from "@/core/tenant/current";
import { getTenantTheme } from "@/core/theme/load";
import { createClient } from "@/lib/supabase/server";
import { ArrowUpRight, CircleUser } from "lucide-react";
import { ThemeStyle } from "@/core/theme/theme-style";

// The booking page lives next to the client's own website and must not compete with it in search (A17).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GuestLayout({ children }: LayoutProps<"/">) {
  const tenant = await getTenantFromHost();
  if (!tenant) return <>{children}</>;
  const supabase = await createClient();
  const [theme, settings, t, tp, ta, { data: contact }] = await Promise.all([
    getTenantTheme(tenant.id),
    getGuestSettings(tenant.id),
    getTranslations("guest.footer"),
    getTranslations("guest.property"),
    getTranslations("guest.account"),
    supabase.rpc("tenant_public_contact", { p_tenant_id: tenant.id }).maybeSingle(),
  ]);
  return (
    <div
      data-tenant-theme
      className={`bg-brand-background text-foreground flex min-h-svh flex-col font-sans ${theme.colorMode === "dark" ? "dark" : ""}`}
    >
      <ThemeStyle theme={theme} scope="page" />
      <header className="border-line border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            {tenant.name}
          </Link>
          <Link
            href="/ucet"
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm"
          >
            <CircleUser className="size-4" /> {ta("menu")}
          </Link>
          {contact?.website_url ? (
            <a
              href={contact.website_url}
              className="text-muted-foreground hover:text-foreground ml-6 inline-flex items-center gap-1 text-sm"
            >
              {tp("backToWeb")} <ArrowUpRight className="size-4" />
            </a>
          ) : null}
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-line text-muted-foreground border-t text-xs">
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
