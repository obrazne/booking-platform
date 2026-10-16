import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  Clock,
  Dog,
  MapPin,
  Quote,
  Users,
} from "lucide-react";
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
import { BookingBox } from "./booking-box";

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
  const { property: p, units, photos, seasons, catalogs, settings } = detail;
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
  const termNames = (kind: string) =>
    terms
      .filter((x) => x.kind === kind && detail.termIds.includes(x.id))
      .map((x) => tr(x.name, locale));
  const fmt = (cents: number) => formatMoney(money(cents, tenant.currency), locale);
  const description = tr(p.description, locale);
  const testimonials = (Array.isArray(p.testimonials) ? p.testimonials : []) as {
    author: string;
    text: string;
  }[];

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6">
      {all.length > 1 ? (
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" /> {t("property.back")}
        </Link>
      ) : null}

      <div className="grid gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{p.name}</h1>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-sm">
          <MapPin className="size-4" /> {[p.street, p.city].filter(Boolean).join(", ")}
        </p>
      </div>

      {photos.length > 0 ? (
        <div className="grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((ph, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- public storage images
            <img
              key={ph.id}
              src={photoUrl(ph.storage_path)}
              alt={tr(ph.alt, locale)}
              className={cn(
                "size-full object-cover",
                i === 0
                  ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                  : "hidden aspect-[4/3] sm:block",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-10">
          <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
            {p.pets_allowed ? (
              <span className="inline-flex items-center gap-1.5">
                <Dog className="size-4" /> {t("property.pets")}
              </span>
            ) : null}
          </div>

          {description ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-semibold">{t("property.overview")}</h2>
              <div className="grid gap-3 leading-relaxed">
                {description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ) : null}

          {p.booking_mode === "units" ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-semibold">{t("property.units")}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {units.map((u) => (
                  <Link
                    key={u.id}
                    href={`/p/${p.slug}?unit=${u.id}`}
                    scroll={false}
                    className={cn(
                      "border-border rounded-xl border p-4 transition-colors",
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
            </section>
          ) : null}

          {termNames("amenity").length > 0 ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-semibold">{t("property.amenities")}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {termNames("amenity").map((n) => (
                  <li key={n} className="inline-flex items-center gap-2">
                    <Check className="text-primary size-4" /> {n}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tr(p.included, locale) ? (
            <section className="grid gap-2">
              <h2 className="font-heading text-xl font-semibold">{t("property.included")}</h2>
              <p className="leading-relaxed">{tr(p.included, locale)}</p>
            </section>
          ) : null}

          <section className="grid gap-3">
            <h2 className="font-heading text-xl font-semibold">{t("property.prices")}</h2>
            <div className="border-border overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-normal">{t("property.season")}</th>
                    <th className="px-4 py-2 font-normal">{t("property.minStay")}</th>
                    <th className="px-4 py-2 text-right font-normal">
                      {t("property.price")} (
                      {p.pricing_model === "per_person_night"
                        ? t("property.perPersonNight")
                        : t("property.perNight")}
                      )
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seasons
                    .filter((s) => catalog.rates[s.id] !== undefined)
                    .sort((a, b) => (catalog.rates[a.id] ?? 0) - (catalog.rates[b.id] ?? 0))
                    .map((s) => (
                      <tr key={s.id} className="border-border border-t">
                        <td className="px-4 py-2">{tr(s.name, locale)}</td>
                        <td className="px-4 py-2">
                          {t("property.nights", { count: s.minNights })}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {fmt(catalog.rates[s.id]!)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {catalog.discounts.length > 0 ? (
              <ul className="text-muted-foreground text-sm">
                {catalog.discounts.map((d) => (
                  <li key={d.id}>{tr(d.name, locale)}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {tr(p.house_rules, locale) ? (
            <section className="grid gap-2">
              <h2 className="font-heading text-xl font-semibold">{t("property.rules")}</h2>
              <p className="leading-relaxed">{tr(p.house_rules, locale)}</p>
            </section>
          ) : null}

          {tr(settings.cancellationPolicy, locale) ? (
            <section className="grid gap-2">
              <h2 className="font-heading text-xl font-semibold">{t("property.cancellation")}</h2>
              <p className="leading-relaxed">{tr(settings.cancellationPolicy, locale)}</p>
            </section>
          ) : null}

          {testimonials.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="font-heading text-xl font-semibold">{t("property.reviews")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map((r) => (
                  <figure key={r.author} className="bg-muted/40 grid gap-2 rounded-xl p-4">
                    <Quote className="text-primary size-5" />
                    <blockquote className="leading-relaxed">{r.text}</blockquote>
                    <figcaption className="text-muted-foreground text-sm">— {r.author}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <BookingBox
            slug={p.slug}
            unitId={unit.id}
            catalog={catalog}
            busy={busy}
            today={today}
            locale={locale}
            modules={modules}
            initial={{
              checkIn: isIsoDate(checkIn) ? checkIn : null,
              checkOut: isIsoDate(checkOut) ? checkOut : null,
              adults: Number(one(sp.adults)) || 2,
              children: Number(one(sp.children)) || 0,
            }}
          />
        </aside>
      </div>
    </main>
  );
}
