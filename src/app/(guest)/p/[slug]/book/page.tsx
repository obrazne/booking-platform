import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getPublicProperty } from "@/core/booking/catalog";
import { formatDate } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { enabledModuleKeysPublic } from "@/core/modules/registry";
import { diffDays, isIsoDate, todayIso } from "@/core/pricing/dates";
import { getTenantFromHost } from "@/core/tenant/current";
import { BookingForm } from "./booking-form";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function BookPage({ params, searchParams }: PageProps<"/p/[slug]/book">) {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const [{ slug }, sp, t, locale] = await Promise.all([
    params,
    searchParams,
    getTranslations("guest"),
    getLocale(),
  ]);
  const detail = await getPublicProperty(tenant, slug);
  const unit = detail.units.find((u) => u.id === one(sp.unit)) ?? detail.units[0];
  const checkIn = one(sp.check_in);
  const checkOut = one(sp.check_out);
  if (
    !unit ||
    !isIsoDate(checkIn) ||
    !isIsoDate(checkOut) ||
    checkOut <= checkIn ||
    checkIn < todayIso()
  ) {
    redirect(`/p/${slug}`);
  }
  const nights = diffDays(checkIn, checkOut);
  const stayLabel = `${detail.property.name}${detail.property.booking_mode === "units" ? ` — ${unit.name}` : ""} · ${formatDate(checkIn, locale)} – ${formatDate(checkOut, locale)} · ${t("booking.nights", { count: nights })}`;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
      <Link
        href={`/p/${slug}?unit=${unit.id}&check_in=${checkIn}&check_out=${checkOut}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> {detail.property.name}
      </Link>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("booking.title")}</h1>
      <BookingForm
        slug={slug}
        unitId={unit.id}
        catalog={detail.catalogs[unit.id]!}
        modules={await enabledModuleKeysPublic(tenant.id)}
        locale={locale}
        today={todayIso()}
        stay={{
          checkIn,
          checkOut,
          adults: Number(one(sp.adults)) || 2,
          children: Number(one(sp.children)) || 0,
        }}
        stayLabel={stayLabel}
        settings={{
          paymentDueHours: detail.settings.paymentDueHours,
          holdMinutes: detail.settings.holdMinutes,
          cancellationPolicy: tr(detail.settings.cancellationPolicy, locale),
          termsUrl: detail.settings.termsUrl,
          privacyUrl: detail.settings.privacyUrl,
        }}
      />
    </main>
  );
}
