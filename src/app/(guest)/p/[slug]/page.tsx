import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import {
  busyNights,
  getPublicProperty,
  listPublicProperties,
  listTerms,
  publicLocation,
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
import type { GuestTestimonial, SectionData } from "@/core/sections/types";
import { nextFreeStay } from "@/core/booking/next-free";
import { Container } from "@/core/sections/ui";
import { getTenantFromHost } from "@/core/tenant/current";
import { loadVerifiedReviews } from "@/modules/reviews/guest/public";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Tab title and description of the property page (Z53: it said "Booking platform"). */
export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const tenant = await getTenantFromHost();
  if (!tenant) return {};
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { property: p } = await getPublicProperty(tenant, slug);
  return {
    title: p.name,
    description: tr(p.summary, locale) || undefined,
  };
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
  const [terms, all, modules, location] = await Promise.all([
    listTerms(tenant.id),
    listPublicProperties(tenant.id),
    enabledModuleKeysPublic(tenant.id),
    publicLocation(p.id),
  ]);

  const verified = modules.includes("reviews") ? await loadVerifiedReviews(tenant.id, p.id) : null;
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
    category: ph.category ?? null,
  }));
  const testimonials: GuestTestimonial[] = detail.testimonials
    .map((r) => ({
      id: r.id,
      author: r.author_name,
      text: tr(r.body, locale),
      source: r.source,
      sourceUrl: r.source_url,
      stayMonth: r.stay_month,
      featured: r.featured,
    }))
    .filter((r) => r.text);
  // Cart and gallery: the reviews the owner featured, verified, instead of the manual testimonials (Z38).
  const featuredVerified: GuestTestimonial[] = (verified?.reviews ?? [])
    .filter((r) => r.featured && r.body)
    .map((r) => ({
      id: r.id,
      author: r.name,
      text: r.body,
      source: "verified",
      sourceUrl: null,
      stayMonth: r.stayMonth,
      featured: true,
    }));
  const bookingTestimonials = featuredVerified.length ? featuredVerified : testimonials;
  const termById = new Map(terms.map((x) => [x.id, x]));
  const highlights = detail.highlighted
    .map((h) => {
      const term = termById.get(h.term_id);
      return term
        ? { key: term.key, name: tr(term.name, locale), note: tr(h.highlight_note, locale) }
        : null;
    })
    .filter((x) => x !== null);
  const nextFree = nextFreeStay(catalog, busy, today);
  const contactInfo = contact
    ? { name: contact.contact_name, phone: contact.contact_phone, whatsapp: contact.whatsapp_phone }
    : null;

  const sectionData: SectionData = {
    locale,
    property: p,
    location,
    units,
    unitId: unit.id,
    photos: photoList,
    seasons,
    catalog,
    amenities: terms
      .filter((x) => x.kind === "amenity" && detail.termIds.includes(x.id))
      .map((x) => ({ key: x.key, name: tr(x.name, locale) })),
    highlights,
    places: detail.places.map((pl) => ({
      name: tr(pl.name, locale),
      how: tr(pl.how, locale),
      distance: pl.distance,
    })),
    cancellationPolicy: policy,
    cancellationShort: policyFirst || null,
    trust,
    nextFree,
    reviewsUrl: detail.reviewsUrl,
    contact: contactInfo,
    testimonials,
    verified,
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
        propertyCity: p.city,
        photos: photoList,
        testimonials: bookingTestimonials,
        reviewsUrl: detail.reviewsUrl,
        settings: {
          paymentDueHours: settings.paymentDueHours,
          paymentMethods: settings.paymentMethods,
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
        {verified ? (
          // Structured data: the rating only from verified published reviews (Z38) — never from manual testimonials.
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "LodgingBusiness",
                name: p.name,
                address: p.city
                  ? { "@type": "PostalAddress", addressLocality: p.city, addressCountry: p.country }
                  : undefined,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: verified.average,
                  reviewCount: verified.count,
                  bestRating: 5,
                  worstRating: 1,
                },
              }).replace(/</g, "\\u003c"),
            }}
          />
        ) : null}
        <PropertySections sections={detail.sections} data={sectionData} modules={modules} />
      </main>
      <StickyBar />
      <MobileBar />
    </BookingProvider>
  );
}
