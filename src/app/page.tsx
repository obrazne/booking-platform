import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getTenantFromHost } from "@/core/tenant/current";
import { getTenantTheme } from "@/core/theme/load";
import { ThemeStyle } from "@/core/theme/theme-style";
import { Button } from "@/components/ui/button";

/** Booking page entry: on a client domain it shows the client's booking (placeholder until part B). */
export default async function Home() {
  const t = await getTranslations();
  const tenant = await getTenantFromHost();

  if (!tenant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-sm">{t("booking.notFound")}</p>
        <Button asChild variant="outline">
          <Link href="/login">{t("common.signIn")}</Link>
        </Button>
      </main>
    );
  }

  const theme = await getTenantTheme(tenant.id);
  return (
    <div data-tenant-theme className="bg-brand-background flex flex-1 flex-col font-sans">
      <ThemeStyle theme={theme} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 p-8">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">{tenant.name}</h1>
        <p className="text-muted-foreground">{t("booking.placeholder")}</p>
        <Button disabled>{t("booking.checkAvailability")}</Button>
      </main>
    </div>
  );
}
