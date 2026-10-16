import { describe, expect, it } from "vitest";
import {
  add,
  allocate,
  CurrencyMismatchError,
  money,
  multiply,
  percentage,
  subtract,
  sum,
} from "./money";
import { formatDate, formatMoney, parseMinorUnits } from "@/core/format/format";

describe("money", () => {
  it("rejects non-integer amounts", () => {
    expect(() => money(10.5, "EUR")).toThrow(RangeError);
  });

  it("adds and subtracts in minor units", () => {
    expect(add(money(1050, "EUR"), money(250, "EUR")).amount).toBe(1300);
    expect(subtract(money(1050, "EUR"), money(2000, "EUR")).amount).toBe(-950);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(1, "EUR"), money(1, "CZK"))).toThrow(CurrencyMismatchError);
  });

  it("sums a list and multiplies by nights", () => {
    expect(sum([money(100, "EUR"), money(250, "EUR")], "EUR").amount).toBe(350);
    expect(multiply(money(12000, "EUR"), 3).amount).toBe(36000);
  });

  it("computes percentages in basis points with rounding to whole cents", () => {
    expect(percentage(money(999, "EUR"), 1000).amount).toBe(100); // 10 % of 9.99 = 0.999 → 1.00
    expect(percentage(money(-999, "EUR"), 1000).amount).toBe(-100);
  });

  it("allocates without losing a cent", () => {
    const parts = allocate(money(1000, "EUR"), [1, 1, 1]);
    expect(parts.map((p) => p.amount)).toEqual([334, 333, 333]);
  });
});

describe("format", () => {
  it("formats euros for Slovak", () => {
    expect(formatMoney(money(123456, "EUR"), "sk").replace(/\s/g, " ")).toBe("1 234,56 €");
  });

  it("parses decimal input into cents", () => {
    expect(parseMinorUnits("123,45", "EUR")).toBe(12345);
    expect(parseMinorUnits("10", "EUR")).toBe(1000);
    expect(parseMinorUnits("0.1", "EUR")).toBe(10);
    expect(parseMinorUnits("1,234", "EUR")).toBeNull();
    expect(parseMinorUnits("abc", "EUR")).toBeNull();
  });

  it("formats calendar dates without timezone shifts", () => {
    expect(formatDate("2026-12-24", "sk", "short")).toBe("24. 12. 2026");
  });
});
