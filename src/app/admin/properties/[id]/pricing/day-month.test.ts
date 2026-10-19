import { describe, expect, it } from "vitest";
import { dayMonthText, parseDayMonth } from "./day-month";

describe("day and month of a yearly season", () => {
  it("shows the stored date without the year", () => {
    expect(dayMonthText("2000-12-23")).toBe("23. 12.");
    expect(dayMonthText("2000-01-02")).toBe("2. 1.");
    expect(dayMonthText("")).toBe("");
  });

  it("reads the usual ways of typing it and stores the year 2000", () => {
    expect(parseDayMonth("23. 12.")).toBe("2000-12-23");
    expect(parseDayMonth("23.12")).toBe("2000-12-23");
    expect(parseDayMonth("2 1")).toBe("2000-01-02");
    expect(parseDayMonth("29. 2.")).toBe("2000-02-29");
  });

  it("refuses what is not a day of the year", () => {
    for (const bad of ["31. 4.", "0. 1.", "12", "23. 13.", "abc", ""])
      expect(parseDayMonth(bad), bad).toBeNull();
  });

  it("round-trips", () => {
    for (const iso of ["2000-12-31", "2000-01-01", "2000-07-15"])
      expect(parseDayMonth(dayMonthText(iso))).toBe(iso);
  });
});
