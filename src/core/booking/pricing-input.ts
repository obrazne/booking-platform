import type { Database } from "@/lib/supabase/database.types";
import type { IsoDate } from "@/core/pricing/dates";
import type { Discount, Fee, PricingInput, Season, Service } from "@/core/pricing/types";
import { asLocalized } from "@/core/i18n/localized";

type Tables = Database["public"]["Tables"];
type SeasonRow = Tables["seasons"]["Row"] & { season_ranges: Tables["season_ranges"]["Row"][] };

/** Everything the price calculation needs for one unit — loaded on the server, serialisable to the browser. */
export type PricingCatalog = {
  currency: string;
  pricingModel: "per_night" | "per_person_night";
  maxGuests: number;
  petsAllowed: boolean;
  touristTax: { included: boolean; amountCents: number };
  accommodationVatBp: number;
  seasons: Season[];
  rates: Record<string, number>;
  fees: Fee[];
  services: Service[];
  /** Public (automatic) discounts only; promo codes are resolved on the server. */
  discounts: Discount[];
};

export function toSeasons(rows: SeasonRow[]): Season[] {
  return rows.map((s) => ({
    id: s.id,
    name: asLocalized(s.name),
    priority: s.priority,
    isDefault: s.is_default,
    minNights: s.min_nights,
    maxNights: s.max_nights,
    arrivalDays: s.arrival_days,
    color: s.color,
    ranges: s.season_ranges.map((r) => ({
      start: r.start_date,
      end: r.end_date,
      repeatYearly: r.repeat_yearly,
    })),
  }));
}

export function toFees(rows: Tables["fees"]["Row"][]): Fee[] {
  return rows
    .filter((f) => f.active)
    .sort((a, b) => a.sort - b.sort)
    .map((f) => ({
      id: f.id,
      name: asLocalized(f.name),
      kind: f.kind as Fee["kind"],
      priceModel: f.price_model as Fee["priceModel"],
      amountCents: f.amount_cents,
      refundableDeposit: f.refundable_deposit,
      vatBp: f.vat_bp,
    }));
}

export function toServices(rows: Tables["services"]["Row"][]): Service[] {
  return rows
    .filter((s) => s.active)
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({
      id: s.id,
      name: asLocalized(s.name),
      priceModel: s.price_model as Service["priceModel"],
      amountCents: s.amount_cents,
      maxQuantity: s.max_quantity,
      vatBp: s.vat_bp,
    }));
}

export function toDiscounts(rows: Tables["discounts"]["Row"][]): Discount[] {
  return rows
    .filter((d) => d.active)
    .map((d) => ({
      id: d.id,
      name: asLocalized(d.name),
      kind: d.kind as Discount["kind"],
      code: d.code,
      percentBp: d.percent_bp,
      amountCents: d.amount_cents,
      minNights: d.min_nights,
      minGuests: d.min_guests,
      maxGuests: d.max_guests,
      bookedFrom: d.booked_from,
      bookedUntil: d.booked_until,
      stayFrom: d.stay_from,
      stayUntil: d.stay_until,
      excludedFrom: d.excluded_from,
      excludedUntil: d.excluded_until,
    }));
}

export type StayRequest = {
  checkIn: IsoDate;
  checkOut: IsoDate;
  adults: number;
  children: number;
  pets: number;
  selectedServices: Record<string, number>;
  selectedFees: Record<string, number>;
  promoCode: string | null;
  bookedOn: IsoDate;
};

export function toPricingInput(
  catalog: PricingCatalog,
  stay: StayRequest,
  extraDiscounts: Discount[] = [],
): PricingInput {
  return {
    currency: catalog.currency,
    pricingModel: catalog.pricingModel,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: stay.adults,
    children: stay.children,
    pets: stay.pets,
    maxGuests: catalog.maxGuests,
    petsAllowed: catalog.petsAllowed,
    seasons: catalog.seasons,
    rates: catalog.rates,
    fees: catalog.fees,
    selectedFees: stay.selectedFees,
    services: catalog.services,
    selectedServices: stay.selectedServices,
    discounts: [...catalog.discounts, ...extraDiscounts],
    promoCode: stay.promoCode,
    bookedOn: stay.bookedOn,
    touristTax: catalog.touristTax,
    accommodationVatBp: catalog.accommodationVatBp,
  };
}

/**
 * Same input without the stay rules of the seasons (minimum / maximum nights, arrival days): staff may book
 * a shorter stay by hand that a guest could not choose on the web (vizuál administrácie v1, 04). Prices stay the same.
 */
export function withoutStayRules(input: PricingInput): PricingInput {
  return {
    ...input,
    seasons: input.seasons.map((s) => ({ ...s, minNights: 1, maxNights: null, arrivalDays: null })),
  };
}
