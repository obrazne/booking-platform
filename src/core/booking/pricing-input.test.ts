import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/core/pricing/calculate";
import type { PricingInput } from "@/core/pricing/types";
import { withoutStayRules } from "./pricing-input";

const input: PricingInput = {
  currency: "EUR",
  pricingModel: "per_night",
  checkIn: "2027-02-12",
  checkOut: "2027-02-13",
  adults: 2,
  children: 0,
  pets: 0,
  maxGuests: 6,
  petsAllowed: false,
  seasons: [
    {
      id: "winter",
      name: { sk: "Zima" },
      priority: 0,
      isDefault: true,
      minNights: 2,
      maxNights: 7,
      arrivalDays: [5],
      ranges: [],
    },
  ],
  rates: { winter: 85000 },
  fees: [],
  selectedFees: {},
  services: [],
  selectedServices: {},
  discounts: [],
  promoCode: null,
  bookedOn: "2026-10-17",
  touristTax: { included: true, amountCents: 0 },
  accommodationVatBp: 0,
};

describe("manual stays by staff", () => {
  it("ignore the guest stay rules but keep the same prices", () => {
    const strict = calculatePrice(input);
    expect(strict.ok).toBe(false);
    const relaxed = calculatePrice(withoutStayRules(input));
    expect(relaxed.ok && relaxed.totalCents).toBe(85000);
    expect(input.seasons[0]!.minNights).toBe(2); // original input untouched
  });
});
