"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getStaffCatalog } from "@/core/booking/staff-catalog";
import { toPricingInput, withoutStayRules } from "@/core/booking/pricing-input";
import { tr } from "@/core/i18n/localized";
import { getEnabledModules } from "@/core/modules/registry";
import { calculatePrice } from "@/core/pricing/calculate";
import { todayIso } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { priceContributorsFor } from "@/modules/price-contributors";

export type StayQuote = {
  nights: number;
  lines: { label: string; quantity: number; amountCents: number; kind: string }[];
  totalCents: number;
  currency: string;
  /** Minimum nights of the arrival season when the selection is shorter (a guest could not book it). */
  minNights: number | null;
  /** Something already occupies a night of the selection. */
  conflict: { label: string; checkIn: string; checkOut: string } | null;
  /** Prices are missing for some night (no rate in the season). */
  noRate: boolean;
};

/**
 * Price of the selected days for the "Nový termín" panel — the same calculation as the web (2 adults, no extras),
 * plus the stay rules as a warning and the collision check against the occupancy.
 */
export async function quoteStay(
  unitId: string,
  checkIn: string,
  checkOut: string,
): Promise<StayQuote | null> {
  const active = await requireTenant();
  const input = z
    .object({ unitId: z.uuid(), checkIn: z.iso.date(), checkOut: z.iso.date() })
    .safeParse({ unitId, checkIn, checkOut });
  if (!input.success || checkOut <= checkIn) return null;
  const staff = await getStaffCatalog(active.tenantId, unitId);
  if (!staff) return null;
  const modules = (await getEnabledModules(active.tenantId)).map((m) => m.key);
  const pricing = toPricingInput(staff.catalog, {
    checkIn,
    checkOut,
    adults: Math.min(2, staff.catalog.maxGuests),
    children: 0,
    pets: 0,
    selectedServices: {},
    selectedFees: {},
    promoCode: null,
    bookedOn: todayIso(),
  });
  const strict = calculatePrice(pricing, priceContributorsFor(modules));
  const price = calculatePrice(withoutStayRules(pricing), priceContributorsFor(modules));
  const minNights =
    !strict.ok && strict.errors.find((e) => e.code === "minNights")
      ? (strict.errors.find((e) => e.code === "minNights") as { min: number }).min
      : null;

  const supabase = await createClient();
  const { data: clash } = await supabase
    .from("occupancy")
    .select("nights, kind, label, reservation:reservations(guest_name, number)")
    .eq("unit_id", unitId)
    .eq("is_blocking", true)
    .neq("kind", "hold")
    .overlaps("nights", `[${checkIn},${checkOut})`)
    .limit(1)
    .maybeSingle();
  const m = clash
    ? /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(clash.nights))
    : null;

  return {
    nights: price.ok ? price.nights : 0,
    lines: price.ok
      ? price.lines
          .filter((l) => l.kind !== "deposit")
          .map((l) => ({
            label: l.labelKey === "touristTax" ? "touristTax" : tr(l.name ?? {}, staff.locale),
            quantity: l.quantity,
            amountCents: l.amountCents,
            kind: l.kind,
          }))
      : [],
    totalCents: price.ok ? price.totalCents : 0,
    currency: staff.catalog.currency,
    minNights,
    conflict:
      clash && m
        ? {
            label: clash.reservation
              ? `${clash.reservation.number} · ${clash.reservation.guest_name}`
              : (clash.label ?? clash.kind),
            checkIn: m[1]!,
            checkOut: m[2]!,
          }
        : null,
    noRate: !price.ok && price.errors.some((e) => e.code === "noRate"),
  };
}

/** Reason of an owner block, edited in the calendar panel. */
export async function updateBlockLabel(id: string, label: string): Promise<ActionResult> {
  await requireTenant();
  const value = label.trim().slice(0, 80) || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("occupancy")
    .update({ label: value })
    .eq("id", id)
    .eq("kind", "block");
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/blocks");
  return ok();
}
