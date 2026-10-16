import { calculatePrice, seasonFor } from "@/core/pricing/calculate";
import { addDays, isoWeekday, type IsoDate } from "@/core/pricing/dates";
import { toPricingInput, type PricingCatalog } from "./pricing-input";

export type NextFree = { checkIn: IsoDate; checkOut: IsoDate; nights: number; totalCents: number };

/**
 * Nearest stay a guest can book (guest page v2, final call): first arrival day from tomorrow on where the minimum
 * stay of that season is free, arrival is allowed and the price can be computed. Facts instead of pressure.
 */
export function nextFreeStay(
  catalog: PricingCatalog,
  busyNights: readonly string[],
  today: IsoDate,
  adults = 2,
  horizonDays = 365,
): NextFree | null {
  const busy = new Set(busyNights);
  for (let i = 1; i <= horizonDays; i++) {
    const checkIn = addDays(today, i);
    const season = seasonFor(checkIn, catalog.seasons);
    if (!season || catalog.rates[season.id] === undefined) continue;
    if (season.arrivalDays?.length && !season.arrivalDays.includes(isoWeekday(checkIn))) continue;
    const nights = Math.max(1, season.minNights);
    let free = true;
    for (let n = 0; n < nights; n++) {
      if (busy.has(addDays(checkIn, n))) {
        free = false;
        break;
      }
    }
    if (!free) continue;
    const checkOut = addDays(checkIn, nights);
    const price = calculatePrice(
      toPricingInput(catalog, {
        checkIn,
        checkOut,
        adults: Math.min(adults, catalog.maxGuests),
        children: 0,
        pets: 0,
        selectedServices: {},
        selectedFees: {},
        promoCode: null,
        bookedOn: today,
      }),
    );
    if (price.ok) return { checkIn, checkOut, nights, totalCents: price.totalCents };
  }
  return null;
}
