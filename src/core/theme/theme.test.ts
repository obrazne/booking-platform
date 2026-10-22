import { describe, expect, it } from "vitest";
import { contrastRatio, readableTextOn } from "./contrast";
import { DEFAULT_THEME, themeToCssVariables, validateTheme } from "./theme";

describe("contrast", () => {
  it("computes black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("picks white text on dark accents and dark text on light ones", () => {
    expect(readableTextOn("#0071e3")).toBe("#ffffff");
    expect(readableTextOn("#ffd60a")).toBe("#111111");
  });
});

describe("theme", () => {
  it("default theme is valid", () => {
    expect(validateTheme(DEFAULT_THEME)).toEqual([]);
  });

  it("reports an accent that is unreadable on the background", () => {
    const issues = validateTheme({ ...DEFAULT_THEME, primaryColor: "#f5f5f7" });
    expect(issues[0]?.code).toBe("lowContrast");
  });

  it("rejects invalid colours and radius", () => {
    const issues = validateTheme({ ...DEFAULT_THEME, secondaryColor: "red", radius: 40 });
    expect(issues.map((i) => i.code).sort()).toEqual(["invalidColor", "invalidRadius"]);
  });

  it("derives the button text colour", () => {
    const vars = themeToCssVariables({ ...DEFAULT_THEME, primaryColor: "#ffd60a" });
    expect(vars["--primary-foreground"]).toBe("#111111");
    expect(vars["--radius"]).toBe("0.625rem");
    expect(vars["--surface-accent"]).not.toBe("#ffd60a"); // light accent → darker surface for white text
  });
});

describe("accent as text (Z83)", () => {
  it("a light accent gets a darker text colour, a dark one stays", () => {
    const gold = themeToCssVariables({ ...DEFAULT_THEME, primaryColor: "#c7b56a" });
    expect(gold["--primary-foreground"]).toBe("#111111");
    expect(gold["--primary-text"]).not.toBe("#c7b56a");
    expect(contrastRatio(gold["--primary-text"]!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(themeToCssVariables(DEFAULT_THEME)["--primary-text"]).toBe(DEFAULT_THEME.primaryColor);
    // The calendar bubble: black next to gold, the platform navy next to a dark accent.
    expect(gold["--tooltip"]).toBe("#111111");
    expect(themeToCssVariables(DEFAULT_THEME)["--tooltip"]).toBe("#11212f");
  });
});
