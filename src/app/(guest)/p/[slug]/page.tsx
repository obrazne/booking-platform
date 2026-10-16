import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import {
  busyNights,
  getPublicProperty,
  listPublicProperties,
  listTerms,
} from "@/core/booking/catalog";
import { BookingProvider, MobileBar, StickyBar } from "@/core/booking/guest-booking";
import { photoUrl } from "@/core/booking/photo";
import { expandRanges } from "@/core/booking/ranges";
import { formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { enabledModuleKeysPublic } from "@/core/modules/registry";
import { addDays, isIsoDate, todayIso } from "@/core/pricing/dates";
import { PropertySections } from "@/core/sections/render";
import type { SectionData } from "@/core/sections/types";
import { Container } from "@/core/sections/ui";
import { getTenantFromHost } from "@/core/tenant/current";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PropertyPage({ params, searchParams }: PageProps<"/p/[slug]">) {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const [{ slug }, sp, t, locale] = await Promise.all([
    params,
    searchParams,
    getTranslations("guest"),
    getLocale(),
  ]);
  const detail = await getPublicProperty(tenant, slug);
  const { property: p, units, photos, seasons, catalogs, settings, serviceRows, contact } = detail;
  const [terms, all, modules] = await Promise.all([
    listTerms(tenant.id),
    listPublicProperties(tenant.id),
    enabledModuleKeysPublic(tenant.id),
  ]);

  const unit = units.find((u) => u.id === one(sp.unit)) ?? units[0];
  if (!unit) notFound();
  const today = todayIso();
  const busy = expandRanges(await busyNights(unit.id, today, addDays(today, 400)));
  const catalog = catalogs[unit.id]!;
  const checkIn = one(sp.check_in);
  const checkOut = one(sp.check_out);
  const hasDates =
    isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn && checkIn >= today;
  const policy = tr(settings.cancellationPolicy, locale);
  const policyFirst = policy ? policy.split(/(?<=\.)\s/)[0]!.replace(/\.$/, "") : "";
  const trust = [
    t("trust.cancellation", { policy: policyFirst || t("trust.noPolicy") }),
    t("trust.hold", { hours: settings.paymentDueHours }),
    t("trust.direct"),
  ];
  const photoList = photos.map((ph) => ({
    url: photoUrl(ph.storage_path),
    alt: tr(ph.alt, locale),
  }));
  const contactInfo = contact
    ? { name: contact.contact_name, phone: contact.contact_phone, whatsapp: contact.whatsapp_phone }
    : null;

  const sectionData: SectionData = {
    locale,
    property: p,
    units,
    unitId: unit.id,
    photos: photoList,
    seasons,
    catalog,
    amenities: terms
      .filter((x) => x.kind === "amenity" && detail.termIds.includes(x.id))
      .map((x) => ({ key: x.key, name: tr(x.name, locale) })),
    cancellationPolicy: policy,
    contact: contactInfo,
    testimonials: (Array.isArray(p.testimonials) ? p.testimonials : []) as {
      author: string;
      text: string;
    }[],
    services: serviceRows.map((s) => ({
      id: s.id,
      name: tr(s.name, locale),
      description: tr(s.description, locale),
      priceModel: s.price_model,
      amountCents: s.amount_cents,
    })),
    // Whole amounts without cents ("700 €"), like the approved visual.
    money: (cents) =>
      cents % 100 === 0
        ? new Intl.NumberFormat(locale, {
            style: "currency",
            currency: tenant.currency,
            maximumFractionDigits: 0,
          }).format(cents / 100)
        : formatMoney(money(cents, tenant.currency), locale),
  };

  return (
    <BookingProvider
      data={{
        slug: p.slug,
        unitId: unit.id,
        catalog,
        busy,
        today,
        locale,
        modules,
        propertyName: p.booking_mode === "units" ? `${p.name} — ${unit.name}` : p.name,
        photos: photoList,
        settings: {
          paymentDueHours: settings.paymentDueHours,
          holdMinutes: settings.holdMinutes,
          cancellationPolicy: policy,
          cancellationShort: policyFirst || null,
          termsUrl: settings.termsUrl,
          privacyUrl: settings.privacyUrl,
        },
        contact: contactInfo,
        services: Object.fromEntries(
          serviceRows.map((s) => [
            s.id,
            {
              image: s.image_path ? photoUrl(s.image_path) : null,
              description: tr(s.description, locale),
            },
          ]),
        ),
        trust,
        initial: {
          checkIn: hasDates ? checkIn : null,
          checkOut: hasDates ? checkOut : null,
          adults: Number(one(sp.adults)) || 2,
          children: Number(one(sp.children)) || 0,
          open: hasDates,
          // "Book again" from the guest zone: services=id:qty,id:qty (only services of this property count).
          services: Object.fromEntries(
            one(sp.services)
              .split(",")
              .map((x) => x.split(":"))
              .filter(([id, q]) => catalog.services.some((s) => s.id === id) && Number(q) > 0)
              .map(([id, q]) => [id!, Math.min(Number(q), 50)]),
          ),
        },
      }}
    >
      <main className="pb-24 lg:pb-0">
        {all.length > 1 ? (
          <Container className="pt-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="size-4" /> {t("property.back")}
            </Link>
          </Container>
        ) : null}
        <PropertySections sections={detail.sections} data={sectionData} modules={modules} />
      </main>
      <StickyBar />
      <MobileBar />
    </BookingProvider>
  );
}
