import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AirVent,
  ArrowRight,
  Bus,
  Check,
  CookingPot,
  Coffee,
  Dog,
  Flame,
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
  Utensils,
  Waves,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import { Gallery } from "@/core/booking/gallery";
import { CalendarSummary, InlineAvailability, SidePanel } from "@/core/booking/guest-booking";
import { tr } from "@/core/i18n/localized";
import { cn } from "@/lib/utils";
import {
  defineSection,
  headingFields,
  localized,
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

/** "Posteľná bielizeň, uteráky a Wi-Fi." → pills. */
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

// ------------------------------------------------------------------------------------------- types

const gallery = defineSection({
  type: "gallery",
  schema: z.object({}).passthrough(),
  render: ({ data }) =>
    data.photos.length === 0 ? null : (
      <Container className="px-0 sm:px-6 sm:pt-6">
        <Gallery photos={data.photos} title={data.property.name} />
      </Container>
    ),
});

const intro = defineSection({
  type: "intro",
  schema: z.object({ kicker: localized.optional(), perex: localized.optional() }),
  render: async ({ content, data }) => {
    const t = await getTranslations("guest.property");
    const p = data.property;
    const facts = [
      {
        label: t("capacity"),
        value: t("guests", { count: p.max_guests }),
      },
      p.bedrooms ? { label: t("bedroomsLabel"), value: String(p.bedrooms) } : null,
      p.bathrooms ? { label: t("bathroomsLabel"), value: String(p.bathrooms) } : null,
      {
        label: t("arrival"),
        value: t("fromTime", { time: p.check_in_from.slice(0, 5) }),
      },
      {
        label: t("departure"),
        value: t("untilTime", { time: p.check_out_until.slice(0, 5) }),
      },
    ].filter((f) => f !== null);
    const kicker = pick(
      content.kicker,
      data.locale,
      [p.city, p.street].filter(Boolean).join(" · "),
    );
    const perex = pick(content.perex, data.locale, tr(p.summary, data.locale));
    return (
      <Container>
        <div
          data-intro
          className="flex flex-wrap items-start gap-12 pt-12 pb-16 sm:pt-14 sm:pb-[72px]"
        >
          <div className="grid min-w-0 flex-[999_1_520px] gap-5">
            <Heading
              as="h1"
              size="xl"
              kicker={kicker}
              title={`${p.name}.`}
              subtitle={tr(p.tagline, data.locale) || undefined}
            />
            {perex ? <p className="text-muted-foreground max-w-2xl text-lg">{perex}</p> : null}
            <div className="border-line divide-line flex flex-wrap divide-x border-y">
              {facts.map((f) => (
                <div key={f.label} className="grid gap-1.5 py-4 pr-6 pl-6 first:pl-0">
                  <span className="kicker text-muted-foreground text-[11px]">{f.label}</span>
                  <span className="text-ink text-[17px] font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
          <aside className="hidden min-w-[300px] flex-[1_1_340px] lg:block">
            <SidePanel />
          </aside>
        </div>
      </Container>
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
    const items = (
      content.items && content.items.length > 0
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
      <Container className="grid gap-10 pb-24">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-8">
          {items.map((it) => (
            <div key={it.key} className="border-line grid content-start gap-3.5 border-t py-6">
              <it.icon className="text-primary size-[26px]" strokeWidth={1.4} />
              <div className="grid gap-1">
                <span className="text-ink text-lg font-bold tracking-tight">{it.title}</span>
                {it.note ? <span className="text-muted-foreground text-sm">{it.note}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </Container>
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
      <section id="termin" className="bg-surface border-line scroll-mt-20 border-y">
        <Container className="grid gap-7 py-20 sm:py-24">
          <Heading
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={pick(content.title, data.locale, t("title"))}
            subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
          />
          <div className="bg-card border-line grid gap-6 rounded-3xl border p-4 shadow-[0_24px_60px_-40px_rgba(17,33,47,0.25)] sm:p-7">
            <InlineAvailability />
            <CalendarSummary />
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
    const pills = includedItems(tr(data.property.included, data.locale));
    return (
      <section className="bg-ink relative overflow-hidden">
        <div
          aria-hidden
          className="absolute top-[-30%] right-[-10%] h-[120%] w-[60%] bg-[radial-gradient(closest-side,rgba(70,130,150,0.28),transparent)] blur-[30px]"
        />
        <Container className="relative grid gap-11 py-24 sm:py-[104px]">
          <Heading
            tone="dark"
            kicker={pick(content.kicker, data.locale, t("kicker"))}
            title={t(perPerson ? "titlePerson" : units ? "titleUnit" : "titleWhole")}
            subtitle={t(perPerson ? "subtitlePerson" : "subtitleWhole")}
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8">
            {seasons.map((s) => (
              <div key={s.id} className="grid content-start gap-2.5 border-t border-white/12 pt-5">
                <span className="text-5xl leading-none font-extrabold tracking-tight text-white sm:text-[56px]">
                  {data.money(rateOf(data, s.id)!)}
                </span>
                <span className="text-[17px] font-bold text-[#f3f5f7]">
                  {tr(s.name, data.locale)}
                </span>
                <span className="font-mono text-xs tracking-wide text-[#8a97a5]">
                  {s.isDefault
                    ? tp("otherDays")
                    : s.ranges.map((r) => `${dm(r.start)}–${dm(r.end)}`).join(" · ")}
                </span>
                <span className="text-sm text-[#b6c1cc]">
                  {t(perPerson ? "perPersonNightFrom" : "perNightFrom", { count: s.minNights })}
                </span>
              </div>
            ))}
          </div>
          {notes.length > 0 || pills.length > 0 ? (
            <div className="grid gap-4">
              <span className="kicker text-[11px] text-[#8a97a5]">
                {[t("included"), ...notes].join(" · ")}
              </span>
              {pills.length > 0 ? (
                <ul className="flex flex-wrap gap-2.5">
                  {pills.map((x) => (
                    <li
                      key={x}
                      className="inline-flex items-center gap-2.5 rounded-full border border-white/14 px-4 py-2.5 text-sm text-[#f3f5f7]"
                    >
                      <Check className="size-4 text-[#8fb4e8]" /> {x}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
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
    const pills = includedItems(tr(data.property.included, data.locale));
    if (pills.length === 0) return null;
    return (
      <Container className="grid gap-8 py-24">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <ul className="flex flex-wrap gap-2.5">
          {pills.map((x) => (
            <li
              key={x}
              className="border-line text-ink inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm"
            >
              <Check className="text-primary size-4" /> {x}
            </li>
          ))}
        </ul>
      </Container>
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
      <Container className="grid gap-8 pb-24">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.units.map((u) => (
            <Link
              key={u.id}
              href={`/p/${data.property.slug}?unit=${u.id}#termin`}
              scroll={false}
              className={cn(
                "border-line grid gap-1 rounded-3xl border p-5 transition-colors",
                u.id === data.unitId ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <span className="text-ink text-lg font-bold tracking-tight">{u.name}</span>
              <span className="text-muted-foreground text-sm">
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
      <Container className="grid gap-8 py-24 lg:grid-cols-[1fr_1fr]">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid gap-6">
          <div className="text-muted-foreground grid gap-3 text-lg leading-relaxed">
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

const location = defineSection({
  type: "location",
  schema: z.object({ ...headingFields, text: localized.optional() }),
  render: async ({ content, data }) => {
    const p = data.property;
    const text = content.text ? tr(content.text, data.locale) : "";
    const hasMap = p.latitude !== null && p.longitude !== null;
    if (!text && !hasMap) return null;
    const t = await getTranslations("guest.sections.location");
    const address = [p.street, [p.postal_code, p.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    return (
      <Container className="grid gap-8 py-24 lg:grid-cols-[1fr_1fr]">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, p.city ? `${p.city}.` : t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid content-start gap-5">
          {text ? <p className="text-muted-foreground text-lg leading-relaxed">{text}</p> : null}
          {address ? (
            <p className="text-ink inline-flex items-center gap-2">
              <MapPin className="text-primary size-4" /> {address}
            </p>
          ) : null}
          {hasMap ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="border-line text-ink inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full border px-5 text-sm font-medium"
            >
              {t("openMap")} <ArrowRight className="size-4" />
            </a>
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
    if (data.testimonials.length === 0) return null;
    const t = await getTranslations("guest.sections.testimonials");
    return (
      <Container className="grid gap-12 py-24 sm:py-[104px]">
        <Heading
          center
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {data.testimonials.slice(0, 3).map((r) => (
            <figure
              key={r.author}
              className="bg-card border-line grid content-between gap-5 rounded-3xl border p-7 shadow-[0_24px_60px_-40px_rgba(17,33,47,0.16)]"
            >
              <blockquote className="text-ink text-lg leading-relaxed">„{r.text}“</blockquote>
              <figcaption className="kicker text-muted-foreground text-[11px]">
                {r.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    );
  },
});

function Accordion({
  items,
}: {
  items: { title: string; rows?: { a: string; b: string }[]; text?: string }[];
}) {
  return (
    <div className="border-line border-t">
      {items.map((it) => (
        <details key={it.title} className="group border-line border-b">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
            <span className="text-ink text-lg font-bold tracking-tight">{it.title}</span>
            <Plus className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-45" />
          </summary>
          <div className="grid pb-5">
            {it.text ? <p className="text-muted-foreground leading-relaxed">{it.text}</p> : null}
            {it.rows?.map((r) => (
              <div
                key={r.a}
                className="border-line flex justify-between gap-4 border-t border-dashed py-2.5 text-[15px] first:border-t-0"
              >
                <span className="text-muted-foreground">{r.a}</span>
                {r.b ? <span className="text-ink text-right font-medium">{r.b}</span> : null}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

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
      <Container className="grid max-w-[820px] gap-6 pt-6 pb-16">
        <Heading
          size="sm"
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
      <Container className="grid max-w-[820px] gap-6 pt-6 pb-24 sm:pb-[104px]">
        <Heading
          size="sm"
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <Accordion items={items} />
      </Container>
    );
  },
});

function contactHref(c: SectionData["contact"]): string | null {
  if (c?.whatsapp) return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
  if (c?.phone) return `tel:${c.phone.replace(/\s/g, "")}`;
  return null;
}

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
        <div className="bg-surface border-line flex flex-wrap items-center justify-between gap-6 rounded-3xl border p-7 sm:p-10">
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
    const href = contactHref(data.contact);
    return (
      <section className="border-line border-t">
        <Container className="grid justify-items-center gap-6 pt-24 pb-[104px] text-center">
          <div className="grid justify-items-center gap-3">
            <p className="kicker text-primary">{pick(content.kicker, data.locale, t("kicker"))}</p>
            <h2 className="font-heading text-ink max-w-[16ch] text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl">
              {pick(content.title, data.locale, t("title"))}{" "}
              <span className="text-ink-soft">
                {pick(content.subtitle, data.locale, t("subtitle"))}
              </span>
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a
              href="#termin"
              className="bg-primary text-primary-foreground inline-flex min-h-[52px] items-center gap-2.5 rounded-full px-7 font-bold"
            >
              {t("choose")} <ArrowRight className="size-4" />
            </a>
            {href ? (
              <a
                href={href}
                className="border-line text-ink inline-flex min-h-[52px] items-center gap-2.5 rounded-full border px-6 font-medium"
              >
                {pick(content.contactLabel, data.locale, t("write"))}
              </a>
            ) : null}
          </div>
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
  prices,
  included,
  units,
  about,
  location,
  testimonials,
  faq,
  rules,
  contact,
  cta,
];
