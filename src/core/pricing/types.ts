import type { IsoDate } from "./dates";

/** Translatable text as stored in the database: {"sk": "...", "en": "..."}. */
export type Localized = Record<string, string>;

export type PriceModel = "per_stay" | "per_night" | "per_person" | "per_person_night" | "per_item";

export type SeasonRange = { start: IsoDate; end: IsoDate; repeatYearly: boolean };

export type Season = {
  id: string;
  name: Localized;
  priority: number;
  isDefault: boolean;
  minNights: number;
  maxNights: number | null;
  /** Allowed ISO weekdays of arrival; null = any. */
  arrivalDays: number[] | null;
  ranges: SeasonRange[];
};

export type Fee = {
  id: string;
  name: Localized;
  kind: "automatic" | "optional" | "pet";
  priceModel: PriceModel;
  amountCents: number;
  refundableDeposit: boolean;
  vatBp: number;
};

export type Service = {
  id: string;
  name: Localized;
  priceModel: PriceModel;
  amountCents: number;
  maxQuantity: number | null;
  vatBp: number;
};

export type Discount = {
  id: string;
  name: Localized;
  kind: "length_of_stay" | "promo";
  code: string | null;
  percentBp: number | null;
  amountCents: number | null;
  minNights: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  bookedFrom: IsoDate | null;
  bookedUntil: IsoDate | null;
  stayFrom: IsoDate | null;
  stayUntil: IsoDate | null;
  excludedFrom: IsoDate | null;
  excludedUntil: IsoDate | null;
};

export type PricingInput = {
  currency: string;
  pricingModel: "per_night" | "per_person_night";
  checkIn: IsoDate;
  checkOut: IsoDate;
  adults: number;
  children: number;
  pets: number;
  maxGuests: number;
  petsAllowed: boolean;
  seasons: Season[];
  /** Rate of the unit per season id (per night, or per person and night). */
  rates: Record<string, number>;
  fees: Fee[];
  /** Optional fees chosen by the guest: id → quantity. */
  selectedFees?: Record<string, number>;
  services: Service[];
  /** Services chosen by the guest: id → quantity (1 for most models). */
  selectedServices?: Record<string, number>;
  /** Automatic discounts plus any promo discount whose code matched (server looks it up). */
  discounts: Discount[];
  promoCode?: string | null;
  /** Booking date — for promo validity windows. */
  bookedOn: IsoDate;
  touristTax: { included: boolean; amountCents: number };
  accommodationVatBp: number;
};

export type LineKind = "accommodation" | "fee" | "service" | "discount" | "tax" | "deposit";

export type PriceLine = {
  kind: LineKind;
  refId: string | null;
  /** Name to show; null when the label is built from labelKey (e.g. tourist tax). */
  name: Localized | null;
  labelKey?: "touristTax";
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  vatBp: number;
  meta: Record<string, unknown>;
};

export type PricingError =
  | { code: "invalidDates" }
  | { code: "minNights"; min: number }
  | { code: "maxNights"; max: number }
  | { code: "arrivalDay"; allowed: number[] }
  | { code: "tooManyGuests"; max: number }
  | { code: "noAdults" }
  | { code: "petsNotAllowed" }
  | { code: "noRate"; date: IsoDate };

export type PricingWarning = { code: "promoNotApplicable" };

export type PricingResult =
  | {
      ok: true;
      nights: number;
      lines: PriceLine[];
      totalCents: number;
      depositCents: number;
      warnings: PricingWarning[];
    }
  | { ok: false; errors: PricingError[] };
