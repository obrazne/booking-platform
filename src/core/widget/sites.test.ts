import { describe, expect, it } from "vitest";
import { frameAncestors, normalizeSite, parseSites } from "./sites";

describe("normalizeSite", () => {
  it("turns a typed website into an origin", () => {
    expect(normalizeSite("chaletstromy.sk")).toBe("https://chaletstromy.sk");
    expect(normalizeSite(" https://www.ChaletStromy.sk/ubytovanie?x=1 ")).toBe(
      "https://www.chaletstromy.sk",
    );
    expect(normalizeSite("http://web-klienta.test:8080/")).toBe("http://web-klienta.test:8080");
    expect(normalizeSite("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("refuses what is not a plain website", () => {
    for (const bad of [
      "",
      "javascript:alert(1)",
      "*.example.com",
      "https://user:pass@example.com",
      "example.com; script-src *",
      "192.168.0.1",
      "ftp://example.com",
      "nieco",
    ])
      expect(normalizeSite(bad), bad).toBeNull();
  });
});

describe("parseSites", () => {
  it("one per line, without duplicates, wrong lines apart", () => {
    expect(parseSites("chaletstromy.sk\nhttps://chaletstromy.sk/\n\nzle zle\nweb.sk")).toEqual({
      sites: ["https://chaletstromy.sk", "https://web.sk"],
      invalid: ["zle zle"],
    });
  });
});

describe("frameAncestors", () => {
  it("own domain and the sites with and without www", () => {
    expect(frameAncestors([])).toBe("frame-ancestors 'self'");
    expect(frameAncestors(["https://chaletstromy.sk", "http://localhost:3000"])).toBe(
      "frame-ancestors 'self' https://chaletstromy.sk https://www.chaletstromy.sk http://localhost:3000",
    );
    expect(frameAncestors(["https://www.web.sk", "bad value;"])).toBe(
      "frame-ancestors 'self' https://www.web.sk https://web.sk",
    );
  });
});
