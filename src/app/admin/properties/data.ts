import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireTenant } from "@/core/admin/action";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

/** Property of the active tenant with everything the editor needs (RLS limits it to the tenant). */
export const getPropertyForEdit = cache(async (id: string) => {
  const active = await requireTenant();
  const tenant = await getTenantInfo(active.tenantId);
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select(
      "*, units(*), seasons(*, season_ranges(*)), rates:units(rates(*)), fees(*), photos(*), property_terms(term_id), property_private(arrival_instructions, door_code, wifi_name, wifi_password)",
    )
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!property) notFound();
  const { data: discounts } = await supabase
    .from("discounts")
    .select("*")
    .eq("tenant_id", tenant.id)
    .or(`property_id.eq.${id},property_id.is.null`)
    .order("created_at");
  const rates = property.rates.flatMap((u) => u.rates);
  return {
    tenant,
    property,
    units: [...property.units].sort((a, b) => a.sort - b.sort),
    seasons: [...property.seasons].sort(
      (a, b) => Number(b.is_default) - Number(a.is_default) || a.sort - b.sort,
    ),
    rates,
    fees: [...property.fees].sort((a, b) => a.sort - b.sort),
    photos: [...property.photos].sort((a, b) => a.sort - b.sort),
    termIds: new Set(property.property_terms.map((t) => t.term_id)),
    arrival: property.property_private?.arrival_instructions ?? {},
    arrivalPrivate: property.property_private ?? null,
    discounts: discounts ?? [],
  };
});

/** Integer minor units → value for a decimal input ("850" or "12,50"). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

export function photoUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${storagePath}`;
}
