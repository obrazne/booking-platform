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
  property: Tables<"properties">;
  units: Omit<Tables<"units">, "ical_export_token">[];
  unitId: string;
  photos: { url: string; alt: string }[];
  seasons: Season[];
  catalog: PricingCatalog;
  amenities: { key: string; name: string }[];
  cancellationPolicy: string;
  contact: { name: string | null; phone: string | null; whatsapp: string | null } | null;
  testimonials: { author: string; text: string }[];
  services: {
    id: string;
    name: string;
    description: string;
    priceModel: string;
    amountCents: number;
  }[];
  money: (cents: number) => string;
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
