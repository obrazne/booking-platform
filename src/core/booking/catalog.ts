import { offeredMethods, upcomingMethods } from "@/core/payments/methods";
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isModuleEnabledPublic } from "@/core/modules/registry";
import type { PublicTenant } from "@/core/tenant/current";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toDiscounts, toFees, toSeasons, toServices, type PricingCatalog } from "./pricing-input";

/** Property columns a guest may read (no street, exact coordinates or contacts — see property_public_location). */
export const PUBLIC_PROPERTY_COLUMNS =
  "id, tenant_id, slug, name, summary, description, house_rules, included, testimonials, status, booking_mode, pricing_model, city, country, max_guests, bedrooms, bathrooms, check_in_from, check_out_until, cleaning_gap_days, pets_allowed, tourist_tax_included, tourist_tax_cents, accommodation_vat_bp, sort, created_at, updated_at, tagline, location_mode, booking_approval";

/** Published properties of the tenant for the catalogue (guest view, RLS for anonymous). */
export const listPublicProperties = cache(async (tenantId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, name, summary, city, max_guests, bedrooms, booking_mode, pricing_model, sort, photos(storage_path, alt, sort), property_terms(term_id), units(id, active, rates(amount_cents))",
    )
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("sort")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => {
    const prices = p.units
      .filter((u) => u.active)
      .flatMap((u) => u.rates.map((r) => r.amount_cents))
      .filter((c) => c > 0);
    return {
      ...p,
      photo: [...p.photos].sort((a, b) => a.sort - b.sort)[0] ?? null,
      termIds: p.property_terms.map((t) => t.term_id),
      fromCents: prices.length > 0 ? Math.min(...prices) : null,
    };
  });
});

export const listTerms = cache(async (tenantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terms")
    .select("id, kind, key, name, sort")
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order("sort");
  return data ?? [];
});

/** Property detail with everything the guest page needs; 404 when it is not published for this tenant. */
export const getPublicProperty = cache(async (tenant: PublicTenant, slug: string) => {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("properties")
    .select(
      `${PUBLIC_PROPERTY_COLUMNS}, units(id, tenant_id, property_id, name, description, max_guests, bedrooms, is_default, active, sort, created_at, rates(*)), photos(*), property_terms(term_id, highlighted, highlight_note, highlight_sort), seasons(*, season_ranges(*)), fees(*), property_sections(id, type, sort, enabled, content), property_places(name, how, distance, sort)`,
    )
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!p) notFound();

  const servicesOn = await isModuleEnabledPublic(tenant.id, "services");
  const [
    { data: discounts },
    { data: services },
    settings,
    { data: contact },
    { data: testimonials },
    { data: reviewsUrl },
  ] = await Promise.all([
    supabase
      .from("discounts")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("kind", "length_of_stay")
      .or(`property_id.eq.${p.id},property_id.is.null`),
    supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .or(`property_id.eq.${p.id},property_id.is.null`),
    getGuestSettings(tenant.id),
    supabase.rpc("tenant_public_contact", { p_tenant_id: tenant.id }).maybeSingle(),
    supabase
      .from("testimonials")
      .select("id, body, author_name, source, source_url, stay_month, featured, sort")
      .eq("tenant_id", tenant.id)
      .or(`property_id.eq.${p.id},property_id.is.null`)
      .order("featured", { ascending: false })
      .order("sort"),
    supabase.rpc("tenant_reviews_url", { p_tenant_id: tenant.id }),
  ]);

  const units = [...p.units].filter((u) => u.active).sort((a, b) => a.sort - b.sort);
  const seasons = toSeasons(p.seasons);
  const base: Omit<PricingCatalog, "rates"> = {
    currency: tenant.currency,
    pricingModel: p.pricing_model as PricingCatalog["pricingModel"],
    maxGuests: p.max_guests,
    petsAllowed: p.pets_allowed,
    touristTax: { included: p.tourist_tax_included, amountCents: p.tourist_tax_cents },
    accommodationVatBp: p.accommodation_vat_bp,
    seasons,
    fees: toFees(p.fees),
    services: servicesOn ? toServices(services ?? []) : [],
    discounts: toDiscounts(discounts ?? []),
  };
  const catalogs: Record<string, PricingCatalog> = Object.fromEntries(
    units.map((u) => [
      u.id,
      {
        ...base,
        maxGuests: p.booking_mode === "units" ? u.max_guests : p.max_guests,
        rates: Object.fromEntries(u.rates.map((r) => [r.season_id, r.amount_cents])),
      },
    ]),
  );

  return {
    property: p,
    units,
    photos: [...p.photos].sort((a, b) => a.sort - b.sort),
    termIds: p.property_terms.map((t) => t.term_id),
    highlighted: p.property_terms
      .filter((t) => t.highlighted)
      .sort((a, b) => a.highlight_sort - b.highlight_sort),
    places: [...p.property_places].sort((a, b) => a.sort - b.sort),
    testimonials: testimonials ?? [],
    reviewsUrl: (reviewsUrl as string | null) ?? null,
    sections: p.property_sections,
    seasons,
    catalogs,
    settings,
    serviceRows: servicesOn ? (services ?? []).filter((x) => x.active) : [],
    contact: contact ?? null,
  };
});

/** Public part of the tenant settings (payment deadline and methods, cancellation policy, legal links). */
export const getGuestSettings = cache(async (tenantId: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_settings")
    .select(
      "payment_due_hours, hold_minutes, cancellation_policy, terms_url, privacy_url, iban, bank_transfer_enabled, card_enabled, stripe_account_id, voucher_enabled",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  // Z81: a suspended licence takes no new reservations.
  const { data: license } = await admin
    .from("tenant_licenses")
    .select("state")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return {
    bookingPaused: license?.state === "suspended",
    /** Ways the guest can pay (Z69): switched on and ready — never the account itself. */
    paymentMethods: offeredMethods(data ?? {}),
    /** Prepared methods shown as "Pripravujeme" — staging only (Z71). */
    upcomingMethods: upcomingMethods(data ?? {}),
    paymentDueHours: data?.payment_due_hours ?? 24,
    holdMinutes: data?.hold_minutes ?? 30,
    cancellationPolicy: (data?.cancellation_policy ?? {}) as Record<string, string>,
    termsUrl: data?.terms_url ?? null,
    privacyUrl: data?.privacy_url ?? null,
  };
});

/** Blocked nights of a unit (no details) for the guest calendar. */
export async function busyNights(unitId: string, from: string, to: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unit_busy_nights", {
    p_unit_id: unitId,
    p_from: from,
    p_to: to,
  });
  return (data ?? []).map((r) => String(r.nights ?? r));
}

/** Pin or rounded area of a published property (approximate = no street, B1). */
export const publicLocation = cache(async (propertyId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("property_public_location", { p_property_id: propertyId })
    .maybeSingle();
  if (!data || data.latitude === null || data.longitude === null) return null;
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    approximate: Boolean(data.approximate),
    street: data.street ?? null,
    postalCode: data.postal_code ?? null,
  };
});
