import { isIsoDate, isoWeekday, monthDay, nightsOf, type IsoDate } from "./dates";
import type {
  Discount,
  Fee,
  LineKind,
  PriceLine,
  PriceModel,
  PricingError,
  PricingInput,
  PricingResult,
  PricingWarning,
  Season,
  SeasonRange,
} from "./types";

/**
 * Price of a stay as a pure function (B3) — the same code runs in the guest's browser for the live summary and on the
 * server, which always recomputes before freezing the lines on the reservation.
 *
 * Order of lines (A5): nights by season → fees → module lines (services) → discounts → tourist tax.
 * Rounding happens per line in whole cents; the total is the sum of the lines (deposits excluded).
 */

export type PriceContext = {
  input: PricingInput;
  nights: IsoDate[];
  persons: number;
};

/** Hook point 1 (A3): modules add their own lines (e.g. services) without the core knowing them. */
export type PriceContributor = (ctx: PriceContext) => PriceLine[];

const KIND_ORDER: Record<LineKind, number> = {
  accommodation: 0,
  fee: 1,
  deposit: 2,
  service: 3,
  discount: 4,
  tax: 5,
};

function inRange(date: IsoDate, range: SeasonRange): boolean {
  if (!range.repeatYearly) return date >= range.start && date <= range.end;
  const md = monthDay(date);
  const start = monthDay(range.start);
  const end = monthDay(range.end);
  return start <= end ? md >= start && md <= end : md >= start || md <= end; // wraps over New Year
}

/** Season of a night: highest priority among seasons covering the date, otherwise the default season. */
export function seasonFor(date: IsoDate, seasons: readonly Season[]): Season | null {
  let best: Season | null = null;
  for (const s of seasons) {
    if (s.isDefault || !s.ranges.some((r) => inRange(date, r))) continue;
    if (!best || s.priority > best.priority) best = s;
  }
  return best ?? seasons.find((s) => s.isDefault) ?? null;
}

/** Quantity multiplier of a price model for this stay. */
export function modelQuantity(
  model: PriceModel,
  nights: number,
  persons: number,
  items = 1,
): number {
  switch (model) {
    case "per_stay":
      return items;
    case "per_night":
      return nights * items;
    case "per_person":
      return persons * items;
    case "per_person_night":
      return persons * nights * items;
    case "per_item":
      return items;
  }
}

function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function discountApplies(
  d: Discount,
  input: PricingInput,
  nights: IsoDate[],
  persons: number,
): boolean {
  if (d.minNights !== null && nights.length < d.minNights) return false;
  if (d.minGuests !== null && persons < d.minGuests) return false;
  if (d.maxGuests !== null && persons > d.maxGuests) return false;
  if (d.bookedFrom && input.bookedOn < d.bookedFrom) return false;
  if (d.bookedUntil && input.bookedOn > d.bookedUntil) return false;
  const first = nights[0]!;
  const last = nights[nights.length - 1]!;
  if (d.stayFrom && first < d.stayFrom) return false;
  if (d.stayUntil && last > d.stayUntil) return false;
  if (d.excludedFrom && d.excludedUntil && first <= d.excludedUntil && last >= d.excludedFrom)
    return false;
  if (d.kind === "promo") {
    const code = input.promoCode?.trim().toUpperCase();
    if (!code || d.code?.toUpperCase() !== code) return false;
  }
  return true;
}

function discountAmount(d: Discount, base: number): number {
  if (d.percentBp !== null) return roundHalfAwayFromZero((base * d.percentBp) / 10_000);
  return Math.min(d.amountCents ?? 0, base);
}

function feeLines(input: PricingInput, nights: number, persons: number): PriceLine[] {
  const lines: PriceLine[] = [];
  for (const fee of input.fees) {
    const items = feeItems(fee, input);
    if (items <= 0) continue;
    const quantity = modelQuantity(fee.priceModel, nights, persons, items);
    lines.push({
      kind: fee.refundableDeposit ? "deposit" : "fee",
      refId: fee.id,
      name: fee.name,
      quantity,
      unitAmountCents: fee.amountCents,
      amountCents: fee.amountCents * quantity,
      vatBp: fee.vatBp,
      meta: { priceModel: fee.priceModel },
    });
  }
  return lines;
}

function feeItems(fee: Fee, input: PricingInput): number {
  if (fee.kind === "automatic") return 1;
  if (fee.kind === "pet") return input.pets;
  return Math.max(0, Math.trunc(input.selectedFees?.[fee.id] ?? 0));
}

export function calculatePrice(
  input: PricingInput,
  contributors: readonly PriceContributor[] = [],
): PricingResult {
  const errors: PricingError[] = [];
  if (!isIsoDate(input.checkIn) || !isIsoDate(input.checkOut) || input.checkOut <= input.checkIn) {
    return { ok: false, errors: [{ code: "invalidDates" }] };
  }
  const nights = nightsOf(input.checkIn, input.checkOut);
  const persons = input.adults + input.children;

  if (input.adults < 1) errors.push({ code: "noAdults" });
  if (persons > input.maxGuests) errors.push({ code: "tooManyGuests", max: input.maxGuests });
  if (input.pets > 0 && !input.petsAllowed) errors.push({ code: "petsNotAllowed" });

  // Stay rules come from the season of the arrival night (B2).
  const arrivalSeason = seasonFor(input.checkIn, input.seasons);
  if (arrivalSeason) {
    if (nights.length < arrivalSeason.minNights) {
      errors.push({ code: "minNights", min: arrivalSeason.minNights });
    }
    if (arrivalSeason.maxNights !== null && nights.length > arrivalSeason.maxNights) {
      errors.push({ code: "maxNights", max: arrivalSeason.maxNights });
    }
    const allowed = arrivalSeason.arrivalDays;
    if (allowed && allowed.length > 0 && !allowed.includes(isoWeekday(input.checkIn))) {
      errors.push({ code: "arrivalDay", allowed });
    }
  }

  // Nights priced by the season of each night, grouped into consecutive runs of the same season and price.
  const accommodation: PriceLine[] = [];
  for (const night of nights) {
    const season = seasonFor(night, input.seasons);
    const rate = season ? input.rates[season.id] : undefined;
    if (!season || rate === undefined) {
      errors.push({ code: "noRate", date: night });
      break;
    }
    const unit = input.pricingModel === "per_person_night" ? rate * persons : rate;
    const last = accommodation[accommodation.length - 1];
    if (last && last.refId === season.id && last.unitAmountCents === unit) {
      last.quantity += 1;
      last.amountCents += unit;
      (last.meta.lastNight as IsoDate) = night;
    } else {
      accommodation.push({
        kind: "accommodation",
        refId: season.id,
        name: season.name,
        quantity: 1,
        unitAmountCents: unit,
        amountCents: unit,
        vatBp: input.accommodationVatBp,
        meta: { firstNight: night, lastNight: night, pricingModel: input.pricingModel },
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const ctx: PriceContext = { input, nights, persons };
  const lines: PriceLine[] = [
    ...accommodation,
    ...feeLines(input, nights.length, persons),
    ...contributors.flatMap((c) => c(ctx)),
  ];

  // Discounts on accommodation; they do not stack — the best applicable one wins.
  const warnings: PricingWarning[] = [];
  const accommodationTotal = accommodation.reduce((s, l) => s + l.amountCents, 0);
  let best: { d: Discount; amount: number } | null = null;
  for (const d of input.discounts) {
    if (!discountApplies(d, input, nights, persons)) continue;
    const amount = discountAmount(d, accommodationTotal);
    if (amount > 0 && (!best || amount > best.amount)) best = { d, amount };
  }
  if (input.promoCode?.trim() && best?.d.kind !== "promo")
    warnings.push({ code: "promoNotApplicable" });
  if (best) {
    lines.push({
      kind: "discount",
      refId: best.d.id,
      name: best.d.name,
      quantity: 1,
      unitAmountCents: -best.amount,
      amountCents: -best.amount,
      vatBp: input.accommodationVatBp,
      meta: { percentBp: best.d.percentBp, code: best.d.kind === "promo" ? best.d.code : null },
    });
  }

  // Tourist tax per adult and night; when included in the price it is not added (B3).
  if (!input.touristTax.included && input.touristTax.amountCents > 0) {
    const quantity = input.adults * nights.length;
    lines.push({
      kind: "tax",
      refId: null,
      name: null,
      labelKey: "touristTax",
      quantity,
      unitAmountCents: input.touristTax.amountCents,
      amountCents: input.touristTax.amountCents * quantity,
      vatBp: 0,
      meta: {},
    });
  }

  lines.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const totalCents = lines
    .filter((l) => l.kind !== "deposit")
    .reduce((s, l) => s + l.amountCents, 0);
  const depositCents = lines
    .filter((l) => l.kind === "deposit")
    .reduce((s, l) => s + l.amountCents, 0);
  return { ok: true, nights: nights.length, lines, totalCents, depositCents, warnings };
}
