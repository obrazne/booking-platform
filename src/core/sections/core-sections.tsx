import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AirVent,
  ArrowRight,
  Bath,
  BedDouble,
  Bus,
  Check,
  CookingPot,
  Coffee,
  Dog,
  Flame,
  Images,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  MountainSnow,
  Phone,
  Plus,
  Snowflake,
  SquareParking,
  ThermometerSun,
  Trees,
  Tv,
  Users,
  Utensils,
  Waves,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import {
  CalendarSummary,
  GalleryButton,
  InlineAvailability,
  OpenCartButton,
  SidePanel,
  TestimonialCarousel,
} from "@/core/booking/guest-booking";
import { tr } from "@/core/i18n/localized";
import { cn } from "@/lib/utils";
import { InteractiveMap } from "./interactive-map";
import { MapPreview } from "./map-preview";
import { VerifiedReviewsSection } from "@/modules/reviews/guest/reviews-section";
import { googleDirectionsUrl } from "@/core/maps/config";
import {
  defineSection,
  headingFields,
  localized,
  type GuestPhoto,
  type SectionData,
  type SectionDef,
} from "./types";
import { Container, Heading, pick } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  parkovanie: SquareParking,
  sauna: ThermometerSun,
  virivka: Waves,
  bazen: WavesLadder,
  gril: Utensils,
  klimatizacia: AirVent,
  lyziaren: MountainSnow,
  kuchyna: CookingPot,
  tv: Tv,
  krb: Flame,
  ranajky: Coffee,
  skibus: Bus,
  terasa: Trees,
  zima: Snowflake,
  zvierata: Dog,
};
const iconKey = z.enum(Object.keys(ICONS) as [string, ...string[]]);

const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

/** "30 a viac dní pred nástupom: zdarma." → rows "left | right" for the Good to know section. */
function sentenceRows(text: string): { a: string; b: string }[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      return i > 0 ? { a: s.slice(0, i).trim(), b: s.slice(i + 1).trim() } : { a: s, b: "" };
    });
}

/** "Posteľná bielizeň, uteráky a Wi-Fi." → items. */
function includedItems(text: string): string[] {
  return text
    .split(/[,.;]\s*|\s+a\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function rateOf(data: SectionData, seasonId: string): number | undefined {
  return data.catalog.rates[seasonId];
}

/** Photos for the inside view: interior first, then bedrooms and wellness, then the rest (B1 categories). */
function insidePhotos(photos: GuestPhoto[]): { photo: GuestPhoto; index: number }[] {
  const order = ["interior", "bedrooms", "wellness"];
  const all = photos.map((photo, index) => ({ photo, index }));
  const preferred = all
    .filter((p) => p.photo.category && order.includes(p.photo.category))
    .sort((a, b) => order.indexOf(a.photo.category!) - order.indexOf(b.photo.category!));
  const rest = all.filter((p) => !preferred.includes(p) && p.index > 2);
  return [...preferred, ...rest].slice(0, 5);
}

// ------------------------------------------------------------------------------------------- pieces

/** Gallery of the intro: 1 large + 2 smaller, 5 thumbnails below (the last with "+N photos"); phones one photo. */
async function HeroGallery({ data }: { data: SectionData }) {
  const t = await getTranslations("guest.v2");
  const photos = data.photos;
  if (photos.length === 0) return null;
  const big = photos.slice(0, 3);
  const thumbs = photos.slice(3, 8);
  const more = photos.length - 8;
  return (
    <div className="grid min-w-0 gap-2">
      <div className="relative -mx-5 h-[280px] sm:hidden">
        <GalleryButton
          index={0}
          label={t("allPhotosCount", { count: photos.length })}
          className="absolute inset-0"
        >
          <Image
            src={photos[0]!.url}
            alt={photos[0]!.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <span className="text-ink absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-medium shadow">
            <Images className="size-4" /> {t("allPhotosCount", { count: photos.length })}
          </span>
        </GalleryButton>
      </div>
      <div className="hidden grid-cols-[2fr_1fr] grid-rows-[206px_206px] gap-2 sm:grid">
        {big.map((p, i) => (
          <GalleryButton
            key={p.url}
            index={i}
            label={p.alt || t("photoN", { n: i + 1 })}
            className={cn("relative overflow-hidden rounded-lg", i === 0 && "row-span-2")}
          >
            <Image
              src={p.url}
              alt={p.alt}
              fill
              priority={i === 0}
              sizes={
                i === 0 ? "(min-width: 1024px) 520px, 66vw" : "(min-width: 1024px) 260px, 33vw"
              }
              className="object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </GalleryButton>
        ))}
      </div>
      {thumbs.length > 0 ? (
        <div className="hidden h-[100px] grid-cols-5 gap-2 sm:grid">
          {thumbs.map((p, i) => {
            const last = i === thumbs.length - 1 && more > 0;
            return (
              <GalleryButton
                key={p.url}
                index={i + 3}
                label={last ? t("morePhotos", { count: more }) : p.alt || t("photoN", { n: i + 4 })}
                className="relative overflow-hidden rounded-md"
              >
                <Image src={p.url} alt="" fill sizes="160px" className="object-cover" />
                {last ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgba(17,33,47,0.55)] text-[15px] font-bold text-white">
                    {t("morePhotos", { count: more })}
                  </span>
                ) : null}
              </GalleryButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

async function MiniMap({ data }: { data: SectionData }) {
  const t = await getTranslations("guest.v2");
  const loc = data.location;
  if (!loc) return null;
  return (
    <a
      href="#okolie"
      className="border-line relative block h-[150px] overflow-hidden rounded-lg border"
    >
      <MapPreview
        approximate={loc.approximate}
        className="absolute inset-0"
        label={t("mapOf", { place: data.property.city ?? data.property.name })}
      />
      <span className="text-ink absolute bottom-3.5 left-1/2 inline-flex min-h-[38px] -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold whitespace-nowrap shadow-[0_10px_24px_-12px_rgba(17,33,47,0.45)]">
        <MapPin className="text-accent-2 size-4" /> {t("showOnMap")}
      </span>
    </a>
  );
}

function Accordion({
  items,
}: {
  items: { title: string; rows?: { a: string; b: string }[]; text?: string }[];
}) {
  return (
    <div className="border-line border-t">
      {items.map((it) => (
        <details key={it.title} className="group border-line border-b">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
            <span className="text-ink text-lg font-bold">{it.title}</span>
            <Plus className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-45" />
          </summary>
          <div className="grid pb-[18px]">
            {it.text ? <p className="text-muted-foreground leading-relaxed">{it.text}</p> : null}
            {it.rows?.map((r) => (
              <div key={r.a} className="flex justify-between gap-4 py-2.5 text-[15px]">
                <span className="text-[#3b3d42]">{r.a}</span>
                {r.b ? <span className="text-ink text-right font-medium">{r.b}</span> : null}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function contactHref(c: SectionData["contact"]): string | null {
  if (c?.whatsapp) return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
  if (c?.phone) return `tel:${c.phone.replace(/\s/g, "")}`;
  return null;
}

// ------------------------------------------------------------------------------------------- types

const gallery = defineSection({
  type: "gallery",
  schema: z.object({}).passthrough(),
  render: ({ data }) => (
    <Container className="pt-6">
      <HeroGallery data={data} />
    </Container>
  ),
});

const intro = defineSection({
  type: "intro",
  schema: z.object({ kicker: localized.optional(), perex: localized.optional() }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.property");
    const p = data.property;
    const facts: { icon: LucideIcon; label: string; value: string }[] = [
      { icon: Users, label: t("capacity"), value: t("guests", { count: p.max_guests }) },
      ...(p.bedrooms
        ? [{ icon: BedDouble, label: t("bedroomsLabel"), value: String(p.bedrooms) }]
        : []),
      ...(p.bathrooms
        ? [{ icon: Bath, label: t("bathroomsLabel"), value: String(p.bathrooms) }]
        : []),
      {
        icon: LogIn,
        label: t("arrival"),
        value: t("fromTime", { time: p.check_in_from.slice(0, 5) }),
      },
      {
        icon: LogOut,
        label: t("departure"),
        value: t("untilTime", { time: p.check_out_until.slice(0, 5) }),
      },
    ];
    const kicker = pick(content.kicker, data.locale, p.city ?? "");
    const perex = pick(content.perex, data.locale, tr(p.summary, data.locale));
    return (
      <div className="border-b border-[#e3e6e2] bg-[linear-gradient(165deg,#f9f8f5_0%,#f2f3f0_50%,#e9eeeb_100%)]">
        <Container className="sm:pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <HeroGallery data={data} />
            <div className="grid min-w-0 content-start gap-4 max-sm:hidden lg:flex lg:flex-col">
              <TestimonialCarousel showAllLink className="flex-1" />
              <MiniMap data={data} />
            </div>
          </div>
          <div
            data-intro
            className="grid gap-6 pt-8 pb-12 sm:pt-14 sm:pb-[72px] lg:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="flex min-w-0 flex-col gap-[18px] lg:pr-6">
              {kicker ? <p className="kicker kicker-sans text-accent-2">{kicker}</p> : null}
              <h1 className="font-heading text-ink text-[40px] leading-[1.04] font-extrabold tracking-[-0.03em] sm:text-6xl">
                {p.name}
              </h1>
              {perex ? (
                <p className="max-w-[54ch] text-lg leading-relaxed text-[#5a6672]">{perex}</p>
              ) : null}
              <div className="mt-auto grid grid-cols-3 rounded-lg border border-[#e4e8e4] bg-white/72 sm:grid-cols-5">
                {facts.map((f, i) => (
                  <div
                    key={f.label}
                    className={cn(
                      "flex flex-col items-center gap-3 px-2 pt-[22px] pb-5 text-center",
                      i > 0 && "sm:border-l sm:border-[#e4e8e4]",
                      i % 3 !== 0 && "max-sm:border-l max-sm:border-[#e4e8e4]",
                      i >= 3 && "max-sm:border-t max-sm:border-[#e4e8e4]",
                    )}
                  >
                    <f.icon className="text-primary size-[34px]" strokeWidth={1.3} />
                    <span className="grid gap-1">
                      <span className="kicker text-[11px] text-[#8b929b]">{f.label}</span>
                      <span className="text-ink text-[17px] font-medium">{f.value}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:hidden">
                <TestimonialCarousel showAllLink />
                <MiniMap data={data} />
              </div>
            </div>
            <aside className="hidden lg:-mt-10 lg:block">
              <SidePanel />
            </aside>
          </div>
        </Container>
      </div>
    );
  },
});

const highlights = defineSection({
  type: "highlights",
  schema: z.object({
    ...headingFields,
    items: z
      .array(
        z.object({
          /** Amenity key (shown only when the property has it); otherwise a custom item with a title. */
          amenity: z.string().optional(),
          icon: iconKey.optional(),
          title: localized.optional(),
          note: localized.optional(),
        }),
      )
      .max(12)
      .optional(),
  }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.highlights");
    const has = new Map(data.amenities.map((a) => [a.key, a.name]));
    // Highlighted amenities of the property first (B1 v2); then items written in the section; then any amenities.
    const items = (
      data.highlights.length > 0
        ? data.highlights.map((h) => ({
            key: h.key,
            icon: ICONS[h.key] ?? Check,
            title: h.name,
            note: h.note,
          }))
        : content.items && content.items.length > 0
          ? content.items.map((it) => {
              if (it.amenity && !has.has(it.amenity)) return null;
              const title = pick(
                it.title,
                data.locale,
                it.amenity ? (has.get(it.amenity) ?? "") : "",
              );
              if (!title) return null;
              return {
                key: it.amenity ?? title,
                icon: ICONS[it.icon ?? it.amenity ?? ""] ?? Check,
                title,
                note: it.note ? tr(it.note, data.locale) : "",
              };
            })
          : data.amenities.slice(0, 6).map((a) => ({
              key: a.key,
              icon: ICONS[a.key] ?? Check,
              title: a.name,
              note: "",
            }))
    ).filter((x) => x !== null);
    if (items.length === 0) return null;
    return (
      <section>
        <Container className="grid gap-7 pt-20 pb-24 sm:pt-[88px] sm:pb-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div className="grid grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => {
              const col3 = i % 3;
              const col2 = i % 2;
              const row3 = Math.floor(i / 3);
              const row2 = Math.floor(i / 2);
              return (
                <div
                  key={it.key}
                  className={cn(
                    "flex flex-col items-center gap-5 px-4 pt-10 pb-9 text-center sm:px-8 sm:pt-12 sm:pb-11",
                    // checkerboard of the soft tint, hairlines between cells only
                    (row2 + col2) % 2 === 1 && "max-lg:bg-[#fbfaf9]",
                    (row3 + col3) % 2 === 1 && "lg:bg-[#fbfaf9]",
                    col2 > 0 && "max-lg:border-l max-lg:border-[#e9e5db]",
                    row2 > 0 && "max-lg:border-t max-lg:border-[#e9e5db]",
                    col3 > 0 && "lg:border-l lg:border-[#e9e5db]",
                    row3 > 0 && "lg:border-t lg:border-[#e9e5db]",
                  )}
                >
                  <it.icon className="text-primary size-[38px]" strokeWidth={1.2} />
                  <span className="grid gap-1.5">
                    <span className="text-ink text-lg font-bold tracking-tight sm:text-xl">
                      {it.title}
                    </span>
                    {it.note ? <span className="text-[15px] text-[#5a6672]">{it.note}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    );
  },
});

const photoBand = defineSection({
  type: "photo_band",
  schema: z.object({ photo: z.number().int().min(0).optional() }),
  render: ({ content, data }) => {
    const photo = data.photos[content.photo ?? 1] ?? data.photos[0];
    if (!photo) return null;
    return (
      <div className="relative h-[320px] w-full sm:h-[560px]">
        <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className="object-cover" />
      </div>
    );
  },
});

const calendar = defineSection({
  type: "calendar",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.calendar");
    return (
      <section id="termin" className="band scroll-mt-20">
        <Container className="grid gap-7 py-20 sm:py-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div className="border-line grid gap-[22px] rounded-lg border bg-white p-4 shadow-[0_24px_60px_-34px_rgba(17,33,47,0.14)] sm:p-[30px]">
            <InlineAvailability />
            <div className="border-line border-t pt-5">
              <CalendarSummary />
            </div>
          </div>
        </Container>
      </section>
    );
  },
});

const location = defineSection({
  type: "location",
  schema: z.object({ ...headingFields, text: localized.optional() }),
  render: async ({ content, data }) => {
    const p = data.property;
    const text = content.text ? tr(content.text, data.locale) : "";
    const loc = data.location;
    if (!loc && data.places.length === 0 && !text) return null;
    const t = await getTranslations("guest.sections.location");
    const tv = await getTranslations("guest.v2");
    const address = loc?.street
      ? [loc.street, [loc.postalCode, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : "";
    return (
      <section id="okolie" className="scroll-mt-20">
        <Container className="grid gap-7 py-20 sm:py-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div className="flex flex-wrap items-stretch gap-8">
            {loc ? (
              <InteractiveMap
                latitude={loc.latitude}
                longitude={loc.longitude}
                approximate={loc.approximate}
                zoom={loc.approximate ? 12 : 13}
                label={tv("mapOf", { place: p.city ?? p.name })}
                zoomLabels={{ in: tv("zoomIn"), out: tv("zoomOut") }}
                className="border-line min-h-[320px] flex-[2_1_520px] rounded-lg border sm:min-h-[400px]"
              />
            ) : null}
            <div className="flex flex-[1_1_300px] flex-col">
              {text ? <p className="pb-4 leading-relaxed text-[#5a6672]">{text}</p> : null}
              {data.places.map((pl) => (
                <div
                  key={pl.name}
                  className="border-line flex items-baseline justify-between gap-4 border-b py-4"
                >
                  <span className="grid gap-0.5">
                    <span className="text-ink font-medium">{pl.name}</span>
                    {pl.how ? <span className="text-[13px] text-[#5a6672]">{pl.how}</span> : null}
                  </span>
                  {pl.distance ? (
                    <span className="text-ink font-mono text-[13px] whitespace-nowrap">
                      {pl.distance}
                    </span>
                  ) : null}
                </div>
              ))}
              {address ? (
                <p className="text-ink inline-flex items-center gap-2 pt-4 text-sm">
                  <MapPin className="text-accent-2 size-4" /> {address}
                </p>
              ) : null}
              {loc && !loc.approximate ? (
                // Exact location only — an approximate one gets the link in the confirmation and instructions.
                <a
                  href={googleDirectionsUrl(loc.latitude, loc.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink border-line mt-4 inline-flex min-h-10 items-center gap-2 self-start rounded-full border px-4 text-sm font-medium hover:bg-black/5"
                >
                  {tv("navigate")} <span aria-hidden>↗</span>
                </a>
              ) : loc?.approximate ? (
                <span className="pt-4 text-[13px] leading-relaxed text-[#5a6672]">
                  {tv("addressAfter")}
                </span>
              ) : null}
            </div>
          </div>
        </Container>
      </section>
    );
  },
});

const prices = defineSection({
  type: "prices",
  // The title follows the pricing model (system data) — only the kicker can be changed.
  schema: z.object({ kicker: localized.optional() }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.prices");
    const tp = await getTranslations("guest.property");
    const seasons = data.seasons
      .filter((s) => rateOf(data, s.id) !== undefined)
      .sort((a, b) => (rateOf(data, a.id) ?? 0) - (rateOf(data, b.id) ?? 0));
    if (seasons.length === 0) return null;
    const perPerson = data.catalog.pricingModel === "per_person_night";
    const units = data.property.booking_mode === "units";
    const notes = [
      ...data.catalog.discounts.map((d) => tr(d.name, data.locale)),
      data.catalog.touristTax.included
        ? t("taxIncluded")
        : data.catalog.touristTax.amountCents > 0
          ? t("taxExtra", { price: data.money(data.catalog.touristTax.amountCents) })
          : null,
    ].filter(Boolean);
    const included = includedItems(tr(data.property.included, data.locale));
    return (
      <section className="band">
        <Container className="grid items-start gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="grid gap-[22px]">
            <Heading
              kicker={pick(content.kicker, data.locale, t("kicker"))}
              title={t(perPerson ? "titlePerson" : units ? "titleUnit" : "titleWhole")}
              subtitle={t(perPerson ? "subtitlePerson" : "subtitleWhole")}
            />
            {included.length > 0 ? (
              <>
                <span className="kicker pt-1.5 text-[11px] text-[#8b929b]">{t("included")}</span>
                <ul className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {included.map((x) => (
                    <li key={x} className="flex items-center gap-2.5 text-[15px] text-[#3b3d42]">
                      <Check className="text-primary size-4 shrink-0" /> {x}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div className="flex flex-col">
            <div className="border-line border-t">
              {seasons.map((s) => (
                <div
                  key={s.id}
                  className="border-line grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1.5 border-b py-5"
                >
                  <span className="text-ink text-lg font-bold">{tr(s.name, data.locale)}</span>
                  <span className="text-ink text-right text-[22px] font-extrabold tracking-tight tabular-nums">
                    {data.money(rateOf(data, s.id)!)}{" "}
                    <span className="text-sm font-normal text-[#5a6672]">
                      {t(perPerson ? "perPersonNightShort" : "perNightShort")}
                    </span>
                  </span>
                  <span className="font-mono text-xs tracking-wide text-[#8b929b]">
                    {s.isDefault
                      ? tp("otherDays")
                      : s.ranges.map((r) => `${dm(r.start)}–${dm(r.end)}`).join(" · ")}
                  </span>
                  <span className="text-right text-sm text-[#5a6672]">
                    {t("minNights", { count: s.minNights })}
                  </span>
                </div>
              ))}
            </div>
            {notes.length > 0 ? (
              <span className="pt-4 text-[13px] text-[#5a6672]">{notes.join(". ")}.</span>
            ) : null}
          </div>
        </Container>
      </section>
    );
  },
});

const inside = defineSection({
  type: "inside",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const mosaic = insidePhotos(data.photos);
    if (mosaic.length < 3) return null;
    const t = await getTranslations("guest.sections.inside");
    const tv = await getTranslations("guest.v2");
    return (
      <section>
        <Container className="grid gap-7 py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading
              kicker={pick(content.kicker, data.locale, t("kicker"))}
              title={pick(content.title, data.locale, t("title"))}
              subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
            />
            <GalleryButton className="text-ink inline-flex min-h-[46px] items-center gap-2.5 rounded-full border border-[#d9ddd8] bg-white px-5 text-[15px] font-medium">
              {tv("allPhotos")} <ArrowRight className="size-4" />
            </GalleryButton>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr] sm:grid-rows-[240px_240px]">
            {mosaic.map(({ photo, index }, i) => (
              <GalleryButton
                key={photo.url}
                index={index}
                label={photo.alt || tv("photoN", { n: index + 1 })}
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-lg sm:aspect-auto",
                  i === 0 && "col-span-2 sm:col-span-1 sm:row-span-2",
                )}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes={
                    i === 0 ? "(min-width: 640px) 440px, 100vw" : "(min-width: 640px) 340px, 50vw"
                  }
                  className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </GalleryButton>
            ))}
          </div>
        </Container>
      </section>
    );
  },
});

const included = defineSection({
  type: "included",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.included");
    const items = includedItems(tr(data.property.included, data.locale));
    if (items.length === 0) return null;
    return (
      <section className="band">
        <Container className="grid gap-8 py-20 sm:py-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <ul className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-[15px] text-[#3b3d42]">
                <Check className="text-primary size-4 shrink-0" /> {x}
              </li>
            ))}
          </ul>
        </Container>
      </section>
    );
  },
});

const units = defineSection({
  type: "units",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    if (data.property.booking_mode !== "units" || data.units.length < 2) return null;
    const t = await getTranslations("guest.sections.units");
    const tp = await getTranslations("guest.property");
    return (
      <Container className="grid gap-8 py-20 sm:py-24">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.units.map((u) => (
            <Link
              key={u.id}
              href={`/p/${data.property.slug}?unit=${u.id}`}
              scroll={false}
              className={cn(
                "border-line grid gap-1 rounded-lg border p-5 transition-colors",
                u.id === data.unitId ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <span className="text-ink text-lg font-bold tracking-tight">{u.name}</span>
              <span className="text-sm text-[#5a6672]">
                {tp("unitCapacity", { count: u.max_guests })}
                {u.bedrooms ? ` · ${tp("bedrooms", { count: u.bedrooms })}` : ""}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    );
  },
});

const about = defineSection({
  type: "about",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const description = tr(data.property.description, data.locale);
    if (!description) return null;
    const t = await getTranslations("guest.sections.about");
    return (
      <Container className="grid gap-8 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid gap-6">
          <div className="grid gap-3 text-lg leading-relaxed text-[#5a6672]">
            {description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {data.amenities.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.amenities.map((a) => (
                <li key={a.key} className="inline-flex items-center gap-2 text-sm">
                  <Check className="text-primary size-4" /> {a.name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    );
  },
});

const testimonials = defineSection({
  type: "testimonials",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    if (data.verified) {
      // Module reviews (Z38): verified reviews replace the manual testimonials, which stay below as other sources.
      const t = await getTranslations("guest.sections.testimonials");
      return (
        <section id="recenzie" className="scroll-mt-20">
          <Container className="py-20 sm:py-24">
            <VerifiedReviewsSection
              verified={data.verified}
              others={data.testimonials}
              heading={{
                kicker: pick(content.kicker, data.locale, t("kicker")),
                title: pick(content.title, data.locale, t("title")),
                subtitle: pick(content.subtitle, data.locale, t("subtitle")),
              }}
              ownerName={data.contact?.name?.trim().split(/\s+/)[0] ?? null}
              locale={data.locale}
            />
          </Container>
        </section>
      );
    }
    if (data.testimonials.length === 0) return null;
    const t = await getTranslations("guest.sections.testimonials");
    const tv = await getTranslations("guest.v2");
    const list = data.testimonials.slice(0, 3);
    return (
      <section className="band">
        <Container className="grid gap-8 py-20 sm:py-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div
            tabIndex={0}
            role="region"
            aria-label={pick(content.title, data.locale, t("title"))}
            className="focus-visible:ring-ring flex snap-x snap-mandatory gap-[18px] overflow-x-auto pb-2 outline-none focus-visible:ring-2 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] sm:overflow-visible"
          >
            {list.map((r) => (
              <figure
                key={r.id}
                className="border-line flex w-[85%] shrink-0 snap-start flex-col gap-5 rounded-lg border bg-white p-[30px] sm:w-auto"
              >
                <blockquote className="text-ink text-lg leading-relaxed">„{r.text}“</blockquote>
                <figcaption className="text-accent-2 mt-auto font-mono text-xs font-medium tracking-wider uppercase">
                  {r.author}
                </figcaption>
              </figure>
            ))}
          </div>
          <GalleryButton className="text-ink justify-self-start text-sm font-medium underline underline-offset-4">
            {tv("allReviewsPhotos")} →
          </GalleryButton>
        </Container>
      </section>
    );
  },
});

const faq = defineSection({
  type: "faq",
  schema: z.object({
    ...headingFields,
    items: z
      .array(z.object({ q: localized, a: localized }))
      .max(30)
      .default([]),
  }),
  render: async ({ content, data }) => {
    const items = content.items
      .map((x) => ({ title: tr(x.q, data.locale), text: tr(x.a, data.locale) }))
      .filter((x) => x.title && x.text);
    if (items.length === 0) return null;
    const t = await getTranslations("guest.sections.faq");
    return (
      <Container className="grid items-start gap-8 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <Accordion items={items} />
      </Container>
    );
  },
});

const rules = defineSection({
  type: "rules",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.rules");
    const tp = await getTranslations("guest.property");
    const p = data.property;
    const houseRules = tr(p.house_rules, data.locale);
    const pet = data.catalog.fees.find((f) => f.kind === "pet");
    const items = [
      data.cancellationPolicy
        ? { title: t("cancellation"), rows: sentenceRows(data.cancellationPolicy) }
        : null,
      {
        title: t("arrival"),
        rows: [
          { a: tp("arrival"), b: tp("fromTime", { time: p.check_in_from.slice(0, 5) }) },
          { a: tp("departure"), b: tp("untilTime", { time: p.check_out_until.slice(0, 5) }) },
          {
            a: t("pets"),
            b: !p.pets_allowed
              ? t("petsNo")
              : pet
                ? t("petsFee", { price: data.money(pet.amountCents) })
                : t("petsYes"),
          },
        ],
      },
      houseRules ? { title: t("houseRules"), rows: sentenceRows(houseRules) } : null,
    ].filter((x) => x !== null);
    return (
      <Container className="grid items-start gap-8 pt-20 pb-24 sm:pt-24 sm:pb-[104px] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <Accordion items={items} />
      </Container>
    );
  },
});

const contact = defineSection({
  type: "contact",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    const c = data.contact;
    if (!c || (!c.phone && !c.whatsapp)) return null;
    const t = await getTranslations("guest.sections.contact");
    const tc = await getTranslations("guest.cart");
    return (
      <Container className="py-16">
        <div className="band border-line flex flex-wrap items-center justify-between gap-6 rounded-lg border p-7 sm:p-10">
          <Heading
            size="sm"
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(
              content.title,
              data.locale,
              c.name ? t("title", { name: c.name }) : t("titleFallback"),
            )}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div className="flex flex-wrap gap-3">
            {c.whatsapp ? (
              <a
                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                className="bg-primary text-primary-foreground inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-medium"
              >
                <MessageCircle className="size-4" /> {tc("whatsapp")}
              </a>
            ) : null}
            {c.phone ? (
              <a
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="border-line text-ink inline-flex min-h-12 items-center gap-2 rounded-full border px-6 font-medium"
              >
                <Phone className="size-4" /> {c.phone}
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    );
  },
});

const cta = defineSection({
  type: "cta",
  schema: z.object({ ...headingFields, contactLabel: localized.optional() }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.sections.cta");
    const tv = await getTranslations("guest.v2");
    const href = contactHref(data.contact);
    const photo = data.photos.find((p) => p.category === "exterior") ?? data.photos[0];
    const next = data.nextFree;
    const d = new Intl.DateTimeFormat(data.locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "UTC",
    });
    const year = new Intl.DateTimeFormat(data.locale, { year: "numeric", timeZone: "UTC" });
    const fmt = (iso: string) => d.format(new Date(`${iso}T00:00:00Z`));
    const card = next ? (
      <OpenCartButton
        stay={{ checkIn: next.checkIn, checkOut: next.checkOut }}
        className="grid w-full gap-1.5 rounded-lg bg-white px-5 py-[18px] text-left shadow-[0_30px_60px_-30px_rgba(17,33,47,0.5)] sm:w-[290px]"
      >
        <span className="text-accent-2 font-mono text-[10px] font-medium tracking-widest uppercase">
          {tv("nextFree", { count: next.nights })}
        </span>
        <span className="text-ink text-lg font-bold">
          {fmt(next.checkIn)} – {fmt(next.checkOut)}{" "}
          {year.format(new Date(`${next.checkOut}T00:00:00Z`))}
        </span>
        <span className="text-[13px] text-[#5a6672]">
          {tv("nextFreeSum", { price: data.money(next.totalCents) })}
        </span>
        <span className="text-primary mt-1 text-[13px] font-semibold">{tv("seeThisStay")} →</span>
      </OpenCartButton>
    ) : null;
    return (
      <section className="bg-surface-accent relative overflow-hidden text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[40%] -left-[12%] h-[120%] w-[55%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent)]"
        />
        <Container className="relative grid items-center gap-12 py-20 sm:py-[104px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="flex flex-col gap-[26px]">
            <p className="kicker kicker-sans text-[#f5c4a1]">
              {pick(content.kicker, data.locale, t("kicker"))}
            </p>
            <h2 className="font-heading text-4xl leading-[1.06] font-extrabold tracking-[-0.03em] text-balance sm:text-[52px]">
              {pick(content.title, data.locale, t("title"))}{" "}
              <span className="text-white/55">
                {pick(content.subtitle, data.locale, t("subtitle"))}
              </span>
            </h2>
            <ul className="grid gap-3.5">
              {data.trust.map((line) => (
                <li key={line} className="flex items-center gap-3 text-white/92">
                  <Check className="size-5 shrink-0" /> {line}
                </li>
              ))}
            </ul>
            {card ? <div className="lg:hidden">{card}</div> : null}
            <div className="mt-1.5 flex flex-wrap gap-3">
              <OpenCartButton
                calendar
                className="btn-on-accent inline-flex min-h-[54px] items-center gap-2.5 px-7"
              >
                {t("choose")} <ArrowRight className="size-4" />
              </OpenCartButton>
              {href ? (
                <a
                  href={href}
                  className="inline-flex min-h-[54px] items-center gap-2.5 rounded-full border border-white/45 px-6 font-medium text-white"
                >
                  <MessageCircle className="size-4" />{" "}
                  {pick(content.contactLabel, data.locale, t("write"))}
                </a>
              ) : null}
            </div>
          </div>
          {photo ? (
            <div className="relative hidden lg:block">
              <div className="relative h-[460px] overflow-hidden rounded-lg">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes="480px"
                  className="object-cover"
                />
              </div>
              {card ? <div className="absolute bottom-8 -left-7">{card}</div> : null}
            </div>
          ) : null}
        </Container>
      </section>
    );
  },
});

/** Core section types (B7). Order here does not matter — the property's sections decide the order. */
export const CORE_SECTIONS: readonly SectionDef[] = [
  gallery,
  intro,
  highlights,
  photoBand,
  calendar,
  location,
  prices,
  inside,
  included,
  units,
  about,
  testimonials,
  faq,
  rules,
  contact,
  cta,
];
