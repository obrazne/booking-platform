import { describe, expect, it } from "vitest";
import {
  axisTop,
  change,
  extremes,
  lastStartedIndex,
  linePath,
  periodMonths,
  shiftMonths,
  totals,
  type MonthStat,
} from "./compute";

const row = (month: string, revenueCents: number, extra: Partial<MonthStat> = {}): MonthStat => ({
  month,
  revenueCents,
  futureCents: 0,
  nightsSold: 0,
  reservations: 0,
  occupiedNights: 0,
  availableNights: 30,
  ...extra,
});

describe("periods", () => {
  it("shifts months across the year boundary both ways", () => {
    expect(shiftMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonths("2026-10-01", -11)).toBe("2025-11-01");
    expect(shiftMonths("2026-03-01", -27)).toBe("2023-12-01");
  });

  it("year and last 12 months", () => {
    expect(periodMonths({ kind: "year", year: 2026 }, "2026-10-17")).toEqual({
      from: "2026-01-01",
      to: "2026-12-01",
    });
    expect(periodMonths({ kind: "12m" }, "2026-10-17")).toEqual({
      from: "2025-11-01",
      to: "2026-10-01",
    });
  });
});

describe("totals", () => {
  it("sums months; occupancy from nights, average price per sold night", () => {
    const t = totals([
      row("2026-01-01", 300_00, {
        nightsSold: 3,
        reservations: 1,
        occupiedNights: 6,
        availableNights: 31,
      }),
      row("2026-02-01", 100_00, { nightsSold: 1, occupiedNights: 1, availableNights: 28 }),
    ]);
    expect(t.revenueCents).toBe(400_00);
    expect(t.reservations).toBe(1);
    expect(t.avgNightCents).toBe(100_00);
    expect(t.occupancy).toBe(11.9); // 7 / 59
  });

  it("empty months give no average and no division by zero", () => {
    const t = totals([row("2026-01-01", 0, { availableNights: 0 })]);
    expect(t.avgNightCents).toBeNull();
    expect(t.occupancy).toBeNull();
  });
});

describe("change", () => {
  it("per cent for amounts, points for occupancy", () => {
    expect(change(120, 100, "%")).toEqual({ direction: "up", value: 20, unit: "%" });
    expect(change(80, 100, "%")).toEqual({ direction: "down", value: 20, unit: "%" });
    expect(change(45, 52, "pp")).toEqual({ direction: "down", value: 7, unit: "pp" });
  });

  it("no comparison without last year's data", () => {
    expect(change(100, 0, "%")).toBeNull();
    expect(change(100, null, "%")).toBeNull();
  });
});

describe("extremes and chart", () => {
  const year = [
    row("2026-01-01", 680_00),
    row("2026-02-01", 590_00),
    row("2026-03-01", 70_00),
    row("2026-04-01", 140_00),
    row("2026-11-01", 0),
    row("2026-12-01", 900_00),
  ];

  it("weakest only among months that have started; strongest may be a confirmed future month", () => {
    expect(lastStartedIndex(year, "2026-04-10")).toBe(3);
    expect(extremes(year, "2026-04-10")).toEqual({ strongest: 5, weakest: 2 });
  });

  it("no labels when there is no revenue at all", () => {
    expect(extremes([row("2026-01-01", 0)], "2026-05-01")).toEqual({
      strongest: null,
      weakest: null,
    });
  });

  it("round axis top and a path through the points", () => {
    expect(axisTop(6_280_00)).toBe(10_000_00);
    expect(axisTop(1_900_00)).toBe(2_000_00);
    expect(axisTop(0)).toBe(100_000);
    const box = { x0: 0, x1: 100, y0: 100, y1: 0 };
    expect(linePath([0, 50, 100], 0, 2, 100, box)).toBe("M0.0 100.0 L50.0 50.0 L100.0 0.0");
    expect(linePath([0, 50, 100], 2, 1, 100, box)).toBe("");
  });
});
