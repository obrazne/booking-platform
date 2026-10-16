import type { ReactNode } from "react";
import { z } from "zod";
import type { PricingCatalog } from "@/core/booking/pricing-input";
import type { Season } from "@/core/pricing/types";
import type { Tables } from "@/lib/supabase/database.types";

/** Localized text as stored in content: { "sk": "…", "en": "…" }. */
export const localized = z.record(z.string(), z.string());
export type Localized = z.infer<typeof localized>;

/** Optional heading overrides every section accepts (kicker above, two-sentence title: first dark, second soft). */
export const headingFields = {
  kicker: localized.optional(),
  title: localized.optional(),
  subtitle: localized.optional(),
};

/**
 * Everything a section may show that the system already knows (B7: prices, min. nights, check-in, amenities,
 * cancellation come from data, never from section content). Built once per page by the property page.
 */
export type SectionData = {
  locale: string;
  /** Public columns only — street, exact position and contacts come through `location` (B1). */
  property: Omit<
    Tables<"properties">,
    "street" | "postal_code" | "latitude" | "longitude" | "contact_email" | "contact_phone"
  >;
  /** Exact pin and address, or a rounded area when the owner chose an approximate location. */
  location: {
    latitude: number;
    longitude: number;
    approximate: boolean;
    street: string | null;
    postalCode: string | null;
  } | null;
  units: Omit<Tables<"units">, "ical_export_token">[];
  unitId: string;
  photos: GuestPhoto[];
  seasons: Season[];
  catalog: PricingCatalog;
  amenities: { key: string; name: string }[];
  /** Highlighted amenities for "What awaits you" (B1 v2), in their order, with a one-line note. */
  highlights: { key: string; name: string; note: string }[];
  places: { name: string; how: string; distance: string | null }[];
  cancellationPolicy: string;
  /** First sentence of the cancellation policy ("Storno zdarma do 30 dní pred príchodom"). */
  cancellationShort: string | null;
  /** Facts for the final call and the cart (cancellation, hold, direct payment). */
  trust: string[];
  /** Nearest bookable stay (computed from occupancy, minimum nights and prices). */
  nextFree: { checkIn: string; checkOut: string; nights: number; totalCents: number } | null;
  reviewsUrl: string | null;
  contact: { name: string | null; phone: string | null; whatsapp: string | null } | null;
  testimonials: GuestTestimonial[];
  services: {
    id: string;
    name: string;
    description: string;
    priceModel: string;
    amountCents: number;
  }[];
  money: (cents: number) => string;
};

export type GuestPhoto = { url: string; alt: string; category: string | null };

export type GuestTestimonial = {
  id: string;
  author: string;
  text: string;
  source: string;
  sourceUrl: string | null;
  stayMonth: string | null;
  featured: boolean;
};

export type SectionProps<C> = { content: C; data: SectionData };

/**
 * A section type: component + zod schema of its content (B7). The component returns null when it has nothing to show
 * (an empty section is hidden). Modules add types through their manifest; core never knows module types.
 */
export type SectionDef<S extends z.ZodType = z.ZodType> = {
  type: string;
  schema: S;
  render: (props: SectionProps<z.infer<S>>) => ReactNode | Promise<ReactNode>;
};

export function defineSection<S extends z.ZodType>(def: SectionDef<S>): SectionDef {
  return def as unknown as SectionDef;
}
