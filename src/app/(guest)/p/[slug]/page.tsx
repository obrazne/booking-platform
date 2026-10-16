import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Bath, BedDouble, Check, ChevronLeft, Clock, Quote, Users } from "lucide-react";
import {
  busyNights,
  getPublicProperty,
  listPublicProperties,
  listTerms,
} from "@/core/booking/catalog";
import { photoUrl } from "@/core/booking/photo";
import { expandRanges } from "@/core/booking/ranges";
import { formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { enabledModuleKeysPublic } from "@/core/modules/registry";
import { addDays, isIsoDate, todayIso } from "@/core/pricing/dates";
import { getTenantFromHost } from "@/core/tenant/current";
import { cn } from "@/lib/utils";
import { BookingProvider, InlineAvailability, MobileBar, SidePanel } from "./booking";
import { Gallery } from "./gallery";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function Section({
  kicker,
  title,
  sub,
  children,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        {kicker ? <p className="kicker text-primary">{kicker}</p> : null}
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {title} {sub ? <span className="text-ink-soft">{sub}</span> : null}
        </h2>
      </div>
      {children}
    </section>
  );
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
  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  const amenities = terms
    .filter((x) => x.kind === "amenity" && detail.termIds.includes(x.id))
    .map((x) => tr(x.name, locale));
  const testimonials = (Array.isArray(p.testimonials) ? p.testimonials : []) as {
    author: string;
    text: string;
  }[];
  const policy = tr(settings.cancellationPolicy, locale);
  const description = tr(p.description, locale);
  const tagline = tr(p.tagline, locale);
  const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;
  const trust = [
    t("trust.cancellation", {
      policy: policy ? policy.split(/(?<=\.)\s/)[0]!.replace(/\.$/, "") : t("trust.noPolicy"),
    }),
    t("trust.hold", { hours: settings.paymentDueHours }),
    t("trust.direct"),
  ];
  const photoList = photos.map((ph) => ({
    url: photoUrl(ph.storage_path),
    alt: tr(ph.alt, locale),
  }));

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
          termsUrl: settings.termsUrl,
          privacyUrl: settings.privacyUrl,
        },
        contact: contact
          ? {
              name: contact.contact_name,
              phone: contact.contact_phone,
              whatsapp: contact.whatsapp_phone,
            }
          : null,
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
        },
      }}
    >
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-6 pb-28 sm:px-6 lg:pb-16">
        {all.length > 1 ? (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" /> {t("property.back")}
          </Link>
        ) : null}

        <Gallery photos={photoList} title={p.name} />

        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="grid min-w-0 content-start gap-12">
            <header className="grid gap-4">
              <p className="kicker text-primary">
                {[p.city, p.street].filter(Boolean).join(" · ")}
              </p>
              <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {p.name}. {tagline ? <span className="text-ink-soft">{tagline}</span> : null}
              </h1>
              {tr(p.summary, locale) ? (
                <p className="text-lg leading-relaxed">{tr(p.summary, locale)}</p>
              ) : null}
              <div className="border-line text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 border-y py-3 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" /> {t("property.guests", { count: p.max_guests })}
                </span>
                {p.bedrooms ? (
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="size-4" /> {t("property.bedrooms", { count: p.bedrooms })}
                  </span>
                ) : null}
                {p.bathrooms ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Bath className="size-4" /> {t("property.bathrooms", { count: p.bathrooms })}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />{" "}
                  {t("property.checkIn", { time: p.check_in_from.slice(0, 5) })} ·{" "}
                  {t("property.checkOut", { time: p.check_out_until.slice(0, 5) })}
                </span>
              </div>
              <ul className="grid gap-2 text-sm">
                {trust.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" /> {line}
                  </li>
                ))}
              </ul>
            </header>

            {p.booking_mode === "units" ? (
              <Section title={t("property.units")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {units.map((u) => (
                    <Link
                      key={u.id}
                      href={`/p/${p.slug}?unit=${u.id}`}
                      scroll={false}
                      className={cn(
                        "border-line rounded-2xl border p-4 transition-colors",
                        u.id === unit.id ? "border-primary bg-primary/5" : "hover:bg-accent",
                      )}
                    >
                      <p className="font-medium">{u.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {t("property.unitCapacity", { count: u.max_guests })}
                      </p>
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section
              kicker={t("property.dates")}
              title={t("property.availability")}
              sub={
                catalog.pricingModel === "per_night" ? t("property.availabilityLead") : undefined
              }
            >
              <div className="bg-card border-line rounded-3xl border p-4 sm:p-6">
                <InlineAvailability />
              </div>
            </Section>

            <Section title={t("property.prices")}>
              <div className="border-line divide-line grid divide-y border-y">
                {seasons
                  .filter((s) => catalog.rates[s.id] !== undefined)
                  .sort((a, b) => (catalog.rates[a.id] ?? 0) - (catalog.rates[b.id] ?? 0))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
                    >
                      <div className="grid gap-0.5">
                        <span className="font-medium">{tr(s.name, locale)}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {s.isDefault
                            ? t("property.otherDays")
                            : s.ranges.map((r) => `${dm(r.start)} – ${dm(r.end)}`).join(" · ")}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {t("property.minStay")}: {t("property.nights", { count: s.minNights })}
                      </span>
                      <span className="font-semibold tabular-nums sm:text-right">
                        {fmt(catalog.rates[s.id]!)}{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          {p.pricing_model === "per_person_night"
                            ? t("property.perPersonNight")
                            : t("property.perNight")}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
              {catalog.discounts.length > 0 ? (
                <ul className="text-muted-foreground text-sm">
                  {catalog.discounts.map((d) => (
                    <li key={d.id}>{tr(d.name, locale)}</li>
                  ))}
                </ul>
              ) : null}
              {catalog.services.length > 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("property.servicesLine", {
                    list: catalog.services.map((s) => tr(s.name, locale).toLowerCase()).join(", "),
                  })}
                </p>
              ) : null}
            </Section>

            {description ? (
              <Section title={t("property.overview")}>
                <div className="grid gap-3 leading-relaxed">
                  {description.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {amenities.length > 0 ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {amenities.map((n) => (
                      <li key={n} className="inline-flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4" /> {n}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Section>
            ) : null}

            {tr(p.included, locale) ? (
              <Section title={t("property.included")}>
                <p className="leading-relaxed">{tr(p.included, locale)}</p>
              </Section>
            ) : null}

            {testimonials.length > 0 ? (
              <Section title={t("property.reviews")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {testimonials.map((r) => (
                    <figure
                      key={r.author}
                      className="bg-card border-line grid gap-3 rounded-3xl border p-5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]"
                    >
                      <Quote className="text-primary size-5" />
                      <blockquote className="leading-relaxed">{r.text}</blockquote>
                      <figcaption className="text-muted-foreground font-mono text-xs uppercase">
                        {r.author}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </Section>
            ) : null}

            {tr(p.house_rules, locale) ? (
              <Section title={t("property.rules")}>
                <p className="leading-relaxed">{tr(p.house_rules, locale)}</p>
              </Section>
            ) : null}

            {policy ? (
              <Section title={t("property.cancellation")}>
                <p className="leading-relaxed">{policy}</p>
              </Section>
            ) : null}
          </div>

          <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
            <SidePanel />
          </aside>
        </div>
      </main>
      <MobileBar />
    </BookingProvider>
  );
}
