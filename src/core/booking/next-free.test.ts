import { describe, expect, it } from "vitest";
import type { PricingCatalog } from "./pricing-input";
import { nextFreeStay } from "./next-free";

const catalog: PricingCatalog = {
  currency: "EUR",
  pricingModel: "per_night",
  maxGuests: 8,
  petsAllowed: false,
  touristTax: { included: true, amountCents: 0 },
  accommodationVatBp: 0,
  seasons: [
    {
      id: "s",
      name: { sk: "Celoročne" },
      priority: 0,
      isDefault: true,
      minNights: 3,
      maxNights: null,
      arrivalDays: null,
      ranges: [],
    },
  ],
  rates: { s: 10000 },
  fees: [],
  services: [],
  discounts: [],
};

describe("nextFreeStay", () => {
  it("skips busy nights and returns the minimum stay with its price", () => {
    const r = nextFreeStay(catalog, ["2027-05-02", "2027-05-04"], "2027-05-01");
    expect(r).toEqual({
      checkIn: "2027-05-05",
      checkOut: "2027-05-08",
      nights: 3,
      totalCents: 30000,
    });
  });
  it("returns null when nothing is free", () => {
    const busy = Array.from({ length: 30 }, (_, i) => `2027-05-${String(i + 2).padStart(2, "0")}`);
    expect(nextFreeStay(catalog, busy, "2027-05-01", 2, 20)).toBeNull();
  });
});
