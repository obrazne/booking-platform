import { describe, expect, it } from "vitest";
import { licenseMonthBasis } from "./basis";

const license = {
  number: "BP-2026-001",
  package: "basic" as const,
  setup_fee_cents: 99000,
  monthly_fee_cents: 15000,
  turnover_bp: 200,
  starts_on: "2026-11-01",
};
const turnover = (month: string, stays: number, orders = 0, kept = 0) => ({
  month,
  stays_cents: stays,
  orders_cents: orders,
  kept_cents: kept,
  total_cents: stays + orders + kept,
});

describe("licence basis (Z81, A10)", () => {
  it("first month: setup + monthly + 2 % of the turnover", () => {
    const b = licenseMonthBasis(license, turnover("2026-11-01", 800000, 20000, 10000));
    expect(b.lines).toEqual([
      { key: "setup", amountCents: 99000 },
      { key: "monthly", amountCents: 15000 },
      { key: "turnover", amountCents: 16600 },
    ]);
    expect(b.totalCents).toBe(130600);
  });

  it("later months without the setup; the model example: 8 000 € in winter → 310 €", () => {
    const b = licenseMonthBasis(license, turnover("2027-01-01", 800000));
    expect(b.lines.map((l) => l.key)).toEqual(["monthly", "turnover"]);
    expect(b.totalCents).toBe(31000);
  });

  it("nothing before the licence starts", () => {
    expect(licenseMonthBasis(license, turnover("2026-10-01", 500000)).lines).toEqual([]);
  });
});
