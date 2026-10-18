import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, focusRingFor } from "./contrast";
import { themeToCssVariables, DEFAULT_THEME } from "./theme";

// Surfaces and fields (Z54, docs/pravidla-rozhrania.md rule 1): the tokens in globals.css keep the edge of a field
// at least 3 : 1 (WCAG 1.4.11) against everything a field can sit on — the page, a card, the soft band of the guest page.

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const token = (name: string) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(root);
  if (!m) throw new Error(`token --${name} missing in :root`);
  return m[1]!;
};
// The soft band of the guest page (.band gradient) and the admin page background.
const BAND = ["#f8f7f3", "#f1f2ee"];

describe("surface and field tokens", () => {
  const surfaces = [token("page"), token("card-surface"), token("field"), ...BAND];

  it("field edge has 3 : 1 against every surface", () => {
    for (const s of surfaces)
      expect(contrastRatio(token("field-border"), s)).toBeGreaterThanOrEqual(3);
  });

  it("the hovered field edge is darker still", () => {
    expect(contrastRatio(token("field-border-hover"), token("field"))).toBeGreaterThan(
      contrastRatio(token("field-border"), token("field")),
    );
  });

  it("fields are white and a card differs from the page", () => {
    expect(token("field")).toBe("#ffffff");
    expect(token("card-surface")).not.toBe(token("page"));
    expect(contrastRatio(token("card-border"), token("page"))).toBeGreaterThan(1.2);
  });

  it("a row under the mouse is visible but soft", () => {
    const r = contrastRatio(token("hover-row"), token("page"));
    expect(r).toBeGreaterThan(1.05);
    expect(r).toBeLessThan(1.3);
  });
});

describe("focus ring of client themes", () => {
  it("keeps a dark accent and darkens a light one to 3 : 1", () => {
    expect(focusRingFor("#2f5d50")).toBe("#2f5d50");
    for (const light of ["#ffd60a", "#a8e6cf", "#f5f5f7", "#7fdbff"]) {
      const ring = focusRingFor(light);
      expect(contrastRatio(ring, "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(ring, "#fafaf8")).toBeGreaterThanOrEqual(3);
    }
  });

  it("is what the theme sets as --ring", () => {
    expect(themeToCssVariables({ ...DEFAULT_THEME, primaryColor: "#ffd60a" })["--ring"]).toBe(
      focusRingFor("#ffd60a"),
    );
  });
});
