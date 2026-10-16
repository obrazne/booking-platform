import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isModuleEnabledPublic } from "@/core/modules/registry";
import type { PublicTenant } from "@/core/tenant/current";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toDiscounts, toFees, toSeasons, toServices, type PricingCatalog } from "./pricing-input";

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
      "*, units(*, rates(*)), photos(*), property_terms(term_id), seasons(*, season_ranges(*)), fees(*)",
    )
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!p) notFound();

  const servicesOn = await isModuleEnabledPublic(tenant.id, "services");
  const [{ data: discounts }, { data: services }, settings, { data: contact }] = await Promise.all([
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
    seasons,
    catalogs,
    settings,
    serviceRows: servicesOn ? (services ?? []).filter((x) => x.active) : [],
    contact: contact ?? null,
  };
});

/** Public part of the tenant settings (payment deadline, cancellation policy, legal links). */
export const getGuestSettings = cache(async (tenantId: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_settings")
    .select("payment_due_hours, hold_minutes, cancellation_policy, terms_url, privacy_url")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return {
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
