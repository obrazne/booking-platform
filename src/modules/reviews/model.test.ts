import { describe, expect, it } from "vitest";
import { publishesAt, reviewActions, reviewDisplayName, stars } from "./model";

describe("reviews model", () => {
  it("shows first name and initial", () => {
    expect(reviewDisplayName("Jana Nováková")).toBe("Jana N.");
    expect(reviewDisplayName("  Ján  Peter  šimko ")).toBe("Ján Š.");
    expect(reviewDisplayName("Cher")).toBe("Cher");
    expect(reviewDisplayName(" ")).toBe("—");
  });

  it("publishes 72 hours after submission", () => {
    expect(publishesAt("2026-10-01T10:00:00Z").toISOString()).toBe("2026-10-04T10:00:00.000Z");
  });

  it("offers only actions that change the state", () => {
    expect(reviewActions("submitted")).toEqual({ publish: true, reject: true });
    expect(reviewActions("published")).toEqual({ publish: false, reject: true });
    expect(reviewActions("rejected")).toEqual({ publish: true, reject: false });
  });

  it("draws stars", () => {
    expect(stars(4)).toBe("★★★★☆");
    expect(stars(9)).toBe("★★★★★");
  });
});
