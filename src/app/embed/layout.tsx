import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantFromHost } from "@/core/tenant/current";
import { getTenantTheme } from "@/core/theme/load";
import { ThemeStyle } from "@/core/theme/theme-style";

// Widget pages (Z83) live in a frame on the client's website: no header, no footer, never in search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EmbedLayout({ children }: LayoutProps<"/embed">) {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const theme = await getTenantTheme(tenant.id);
  return (
    <div data-tenant-theme className="text-foreground font-sans">
      <ThemeStyle theme={theme} scope="page" />
      {children}
    </div>
  );
}
