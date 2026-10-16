import { describe, expect, it } from "vitest";
import { servicesPriceContributor } from "@/modules/services/pricing";
import { calculatePrice, seasonFor } from "./calculate";
import type { Discount, PricingInput, Season } from "./types";

// Chalet STRÖMY price list (docs/podklady/chalet-stromy-podklady.md), repeating every year.
const allYear: Season = {
  id: "all",
  name: { sk: "Celoročne" },
  priority: 0,
  isDefault: true,
  minNights: 2,
  maxNights: null,
  arrivalDays: null,
  ranges: [],
};
const winter: Season = {
  id: "winter",
  name: { sk: "Zimná sezóna" },
  priority: 10,
  isDefault: false,
  minNights: 3,
  maxNights: null,
  arrivalDays: null,
  ranges: [
    { start: "2000-12-19", end: "2000-12-22", repeatYearly: true },
    { start: "2000-12-27", end: "2000-12-30", repeatYearly: true },
    { start: "2000-01-02", end: "2000-02-28", repeatYearly: true },
  ],
};
const christmas: Season = {
  id: "xmas",
  name: { sk: "Vianoce a Silvester" },
  priority: 20,
  isDefault: false,
  minNights: 4,
  maxNights: null,
  arrivalDays: null,
  ranges: [
    { start: "2000-12-23", end: "2000-12-26", repeatYearly: true },
    { start: "2000-12-31", end: "2000-01-01", repeatYearly: true },
  ],
};

const weekDiscount: Discount = {
  id: "week",
  name: { sk: "Zľava od 6 nocí" },
  kind: "length_of_stay",
  code: null,
  percentBp: 1000,
  amountCents: null,
  minNights: 6,
  minGuests: null,
  maxGuests: null,
  bookedFrom: null,
  bookedUntil: null,
  stayFrom: null,
  stayUntil: null,
  excludedFrom: null,
  excludedUntil: null,
};

const firstMinute: Discount = {
  ...weekDiscount,
  id: "zima15",
  name: { sk: "FIRST MINUTE ZIMA" },
  kind: "promo",
  code: "ZIMAVJASNEJ15",
  percentBp: 1500,
  minNights: null,
  minGuests: 4,
  maxGuests: 10,
  bookedUntil: "2026-11-30",
  excludedFrom: "2026-12-19",
  excludedUntil: "2027-01-31",
};

function stromy(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    currency: "EUR",
    pricingModel: "per_night",
    checkIn: "2026-12-21",
    checkOut: "2026-12-24",
    adults: 4,
    children: 0,
    pets: 0,
    maxGuests: 12,
    petsAllowed: true,
    seasons: [allYear, winter, christmas],
    rates: { all: 70000, winter: 85000, xmas: 120000 },
    fees: [
      {
        id: "pet",
        name: { sk: "Pobyt so zvieraťom" },
        kind: "pet",
        priceModel: "per_night",
        amountCents: 2000,
        refundableDeposit: false,
        vatBp: 0,
      },
    ],
    services: [
      {
        id: "breakfast",
        name: { sk: "Raňajky" },
        priceModel: "per_person_night",
        amountCents: 1500,
        maxQuantity: null,
        vatBp: 0,
      },
      {
        id: "chef",
        name: { sk: "Privátny šéfkuchár" },
        priceModel: "per_person",
        amountCents: 6500,
        maxQuantity: null,
        vatBp: 0,
      },
      {
        id: "transfer",
        name: { sk: "Transfer z letiska" },
        priceModel: "per_item",
        amountCents: 9000,
        maxQuantity: 2,
        vatBp: 0,
      },
    ],
    discounts: [weekDiscount, firstMinute],
    bookedOn: "2026-10-20",
    touristTax: { included: true, amountCents: 150 },
    accommodationVatBp: 0,
    ...overrides,
  };
}

const ok = (input: PricingInput) => {
  const result = calculatePrice(input, [servicesPriceContributor]);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
};

describe("seasons", () => {
  it("picks the season of each night, including the range over New Year", () => {
    const seasons = [allYear, winter, christmas];
    expect(seasonFor("2026-12-22", seasons)?.id).toBe("winter");
    expect(seasonFor("2026-12-23", seasons)?.id).toBe("xmas");
    expect(seasonFor("2026-12-31", seasons)?.id).toBe("xmas");
    expect(seasonFor("2027-01-01", seasons)?.id).toBe("xmas");
    expect(seasonFor("2027-01-02", seasons)?.id).toBe("winter");
    expect(seasonFor("2027-07-15", seasons)?.id).toBe("all");
  });
});

describe("calculatePrice — Chalet STRÖMY", () => {
  it("21.–24. 12. = 2 × 850 € + 1 × 1 200 €", () => {
    const r = ok(stromy());
    expect(r.nights).toBe(3);
    expect(r.lines.map((l) => [l.refId, l.quantity, l.unitAmountCents])).toEqual([
      ["winter", 2, 85000],
      ["xmas", 1, 120000],
    ]);
    expect(r.totalCents).toBe(290000);
  });

  it("takes the minimum stay from the season of the arrival day", () => {
    const r = calculatePrice(stromy({ checkIn: "2026-12-23", checkOut: "2026-12-26" }));
    expect(r).toEqual({ ok: false, errors: [{ code: "minNights", min: 4 }] });
    expect(calculatePrice(stromy({ checkIn: "2027-07-01", checkOut: "2027-07-03" })).ok).toBe(true);
    expect(calculatePrice(stromy({ checkIn: "2027-07-01", checkOut: "2027-07-02" }))).toEqual({
      ok: false,
      errors: [{ code: "minNights", min: 2 }],
    });
  });

  it("gives −10 % on accommodation from the 6th night", () => {
    const r = ok(stromy({ checkIn: "2027-02-01", checkOut: "2027-02-07" }));
    expect(r.lines.at(-1)).toMatchObject({ kind: "discount", refId: "week", amountCents: -51000 });
    expect(r.totalCents).toBe(6 * 85000 - 51000);
  });

  it("applies a valid promo code and only the best discount", () => {
    const promo = ok(
      stromy({ checkIn: "2027-02-05", checkOut: "2027-02-08", promoCode: " zimavjasnej15 " }),
    );
    expect(promo.lines.at(-1)).toMatchObject({ refId: "zima15", amountCents: -38250 });
    const both = ok(
      stromy({ checkIn: "2027-02-01", checkOut: "2027-02-07", promoCode: "ZIMAVJASNEJ15" }),
    );
    expect(both.lines.filter((l) => l.kind === "discount")).toHaveLength(1);
    expect(both.lines.at(-1)?.refId).toBe("zima15");
  });

  it("rejects the promo code in excluded dates, after the booking window or for too few guests", () => {
    for (const overrides of [
      { checkIn: "2027-01-10", checkOut: "2027-01-13" },
      { checkIn: "2027-02-05", checkOut: "2027-02-08", bookedOn: "2026-12-01" },
      { checkIn: "2027-02-05", checkOut: "2027-02-08", adults: 3 },
    ]) {
      const r = ok(stromy({ ...overrides, promoCode: "ZIMAVJASNEJ15" }));
      expect(r.lines.some((l) => l.kind === "discount")).toBe(false);
      expect(r.warnings).toEqual([{ code: "promoNotApplicable" }]);
    }
  });

  it("prices services per person and night, per person, per item; pet fee per night", () => {
    const r = ok(
      stromy({
        checkIn: "2027-07-01",
        checkOut: "2027-07-04",
        pets: 1,
        selectedServices: { breakfast: 1, chef: 1, transfer: 5 },
      }),
    );
    const byRef = Object.fromEntries(r.lines.map((l) => [l.refId, l.amountCents]));
    expect(byRef).toMatchObject({
      all: 3 * 70000,
      pet: 3 * 2000,
      breakfast: 4 * 3 * 1500,
      chef: 4 * 6500,
      transfer: 2 * 9000, // capped at max quantity
    });
    expect(r.lines.map((l) => l.kind)).toEqual([
      "accommodation",
      "fee",
      "service",
      "service",
      "service",
    ]);
    expect(r.totalCents).toBe(210000 + 6000 + 18000 + 26000 + 18000);
  });

  it("does not add the tourist tax when it is included; adds it per adult and night otherwise", () => {
    expect(ok(stromy()).lines.some((l) => l.kind === "tax")).toBe(false);
    const r = ok(stromy({ touristTax: { included: false, amountCents: 150 }, children: 2 }));
    expect(r.lines.at(-1)).toMatchObject({ kind: "tax", quantity: 4 * 3, amountCents: 1800 });
  });

  it("validates guests, pets and dates", () => {
    expect(calculatePrice(stromy({ adults: 10, children: 3 }))).toMatchObject({
      ok: false,
      errors: [{ code: "tooManyGuests", max: 12 }],
    });
    expect(calculatePrice(stromy({ pets: 1, petsAllowed: false }))).toMatchObject({
      ok: false,
      errors: [{ code: "petsNotAllowed" }],
    });
    expect(calculatePrice(stromy({ checkOut: "2026-12-21" }))).toEqual({
      ok: false,
      errors: [{ code: "invalidDates" }],
    });
    expect(calculatePrice(stromy({ checkIn: "2026-02-30" }))).toEqual({
      ok: false,
      errors: [{ code: "invalidDates" }],
    });
  });

  it("prices per person and night when the property uses that model", () => {
    const r = ok(
      stromy({
        pricingModel: "per_person_night",
        rates: { all: 2500 },
        checkIn: "2027-07-01",
        checkOut: "2027-07-03",
        adults: 2,
        children: 1,
      }),
    );
    expect(r.totalCents).toBe(2 * 3 * 2500);
  });

  it("reports a night without a rate", () => {
    expect(calculatePrice(stromy({ rates: { winter: 85000 } }))).toEqual({
      ok: false,
      errors: [{ code: "noRate", date: "2026-12-23" }],
    });
  });
});
