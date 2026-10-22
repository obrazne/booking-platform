import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { todayIso } from "@/core/pricing/dates";
import { getTenantFromHost } from "@/core/tenant/current";
import { CalendarWidget } from "@/core/widget/calendar-widget";
import { loadWidgetData } from "@/core/widget/data";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/embed/kalendar">): Promise<Metadata> {
  const t = await getTranslations("guest.widget");
  return { title: t("title", { name: one((await searchParams).objekt) }) };
}

/**
 * The widget "kalendár s cenami" for the client's website (Z83): `/embed/kalendar?objekt=<slug>[&pozadie=priehladne]`,
 * put in a frame by `/widget.js`. Without sign-in and cookies; in a frame only on the websites the client allowed.
 */
export default async function CalendarEmbed({ searchParams }: PageProps<"/embed/kalendar">) {
  const [tenant, sp, locale, t] = await Promise.all([
    getTenantFromHost(),
    searchParams,
    getLocale(),
    getTranslations("guest.widget"),
  ]);
  const today = todayIso();
  const slug = one(sp.objekt);
  const data =
    tenant && slug
      ? await loadWidgetData(tenant.id, tenant.currency, slug, one(sp.unit), today)
      : null;
  const transparent = one(sp.pozadie) === "priehladne";
  return (
    <main className="mx-auto w-full max-w-5xl">
      {/* Background of the client's page through (pozadie=priehladne) or white. */}
      <style>{`html,body{background:${transparent ? "transparent" : "#fff"} !important}`}</style>
      {data ? (
        <CalendarWidget
          slug={data.slug}
          unitId={one(sp.unit) ? data.unitId : null}
          name={data.name}
          catalog={data.catalog}
          busy={data.busy}
          today={today}
          locale={locale}
          bookingUrl={`/p/${data.slug}`}
        />
      ) : (
        <p className="text-muted-foreground p-4 text-sm">{t("notFound")}</p>
      )}
    </main>
  );
}
