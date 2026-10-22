import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { expandRanges } from "@/core/booking/ranges";
import { toDiscounts, toFees, toSeasons, type PricingCatalog } from "@/core/booking/pricing-input";
import { addDays } from "@/core/pricing/dates";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export type WidgetData = {
  slug: string;
  name: string;
  unitId: string;
  catalog: PricingCatalog;
  busy: string[];
};

/**
 * Prices and occupancy for the widget (Z83): what the calendar of the property page shows, as an anonymous guest
 * (RLS for published properties), without services (the widget prices only the stay). Cached for a minute — the
 * widget is loaded on every visit of the client's website; the booking itself checks availability again.
 */
export const loadWidgetData = unstable_cache(
  async (
    tenantId: string,
    currency: string,
    slug: string,
    unitParam: string,
    today: string,
  ): Promise<WidgetData | null> => {
    const supabase = createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: p } = await supabase
      .from("properties")
      .select(
        "id, slug, name, booking_mode, pricing_model, max_guests, pets_allowed, tourist_tax_included, tourist_tax_cents, accommodation_vat_bp, units(id, name, max_guests, active, sort, rates(*)), seasons(*, season_ranges(*)), fees(*)",
      )
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!p) return null;
    const units = [...p.units].filter((u) => u.active).sort((a, b) => a.sort - b.sort);
    const unit = units.find((u) => u.id === unitParam) ?? units[0];
    if (!unit) return null;
    const [{ data: discounts }, { data: busy }] = await Promise.all([
      supabase
        .from("discounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("kind", "length_of_stay")
        .or(`property_id.eq.${p.id},property_id.is.null`),
      supabase.rpc("unit_busy_nights", {
        p_unit_id: unit.id,
        p_from: today,
        p_to: addDays(today, 400),
      }),
    ]);
    return {
      slug: p.slug,
      name: p.booking_mode === "units" ? `${p.name} — ${unit.name}` : p.name,
      unitId: unit.id,
      catalog: {
        currency,
        pricingModel: p.pricing_model as PricingCatalog["pricingModel"],
        maxGuests: p.booking_mode === "units" ? unit.max_guests : p.max_guests,
        petsAllowed: p.pets_allowed,
        touristTax: { included: p.tourist_tax_included, amountCents: p.tourist_tax_cents },
        accommodationVatBp: p.accommodation_vat_bp,
        seasons: toSeasons(p.seasons),
        rates: Object.fromEntries(unit.rates.map((r) => [r.season_id, r.amount_cents])),
        fees: toFees(p.fees),
        services: [],
        discounts: toDiscounts(discounts ?? []),
      },
      busy: expandRanges((busy ?? []).map((r) => String(r.nights ?? r))),
    };
  },
  ["widget-data"],
  { revalidate: 60 },
);
