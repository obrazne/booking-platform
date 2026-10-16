import "server-only";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { toDiscounts, toFees, toSeasons, toServices, type PricingCatalog } from "./pricing-input";

/** Pricing data of one unit read with the staff member's rights (also unpublished properties) — manual reservations. */
export async function getStaffCatalog(tenantId: string, unitId: string) {
  const supabase = await createClient();
  const tenant = await getTenantInfo(tenantId);
  const { data: unit } = await supabase
    .from("units")
    .select(
      "id, max_guests, rates(season_id, amount_cents), property:properties(id, booking_mode, pricing_model, max_guests, pets_allowed, tourist_tax_included, tourist_tax_cents, accommodation_vat_bp, seasons(*, season_ranges(*)), fees(*))",
    )
    .eq("id", unitId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!unit?.property) return null;
  const p = unit.property;
  const [{ data: discounts }, { data: services }, servicesOn] = await Promise.all([
    supabase
      .from("discounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("kind", "length_of_stay")
      .or(`property_id.eq.${p.id},property_id.is.null`),
    supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`property_id.eq.${p.id},property_id.is.null`),
    isModuleEnabled(tenantId, "services"),
  ]);
  const catalog: PricingCatalog = {
    currency: tenant.currency,
    pricingModel: p.pricing_model as PricingCatalog["pricingModel"],
    maxGuests: p.booking_mode === "units" ? unit.max_guests : p.max_guests,
    petsAllowed: p.pets_allowed,
    touristTax: { included: p.tourist_tax_included, amountCents: p.tourist_tax_cents },
    accommodationVatBp: p.accommodation_vat_bp,
    seasons: toSeasons(p.seasons),
    rates: Object.fromEntries(unit.rates.map((r) => [r.season_id, r.amount_cents])),
    fees: toFees(p.fees),
    services: servicesOn ? toServices(services ?? []) : [],
    discounts: toDiscounts(discounts ?? []),
  };
  return { catalog, propertyId: p.id, locale: tenant.defaultLocale };
}
