import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.FORM_SECRET = "test-secret";
const { issueFormToken, verifyFormToken } = await import("./form-token");

describe("form token", () => {
  it("accepts a signed token after the minimum time", () => {
    const t = issueFormToken(1_000_000);
    expect(verifyFormToken(t, 3000, 1_004_000)).toBe(true);
  });
  it("rejects too fast, too old and forged tokens", () => {
    const t = issueFormToken(1_000_000);
    expect(verifyFormToken(t, 3000, 1_001_000)).toBe(false);
    expect(verifyFormToken(t, 3000, 1_000_000 + 25 * 3600_000)).toBe(false);
    expect(verifyFormToken("1000000.forged", 3000, 1_004_000)).toBe(false);
    expect(verifyFormToken(t.replace("1000000", "900000"), 3000, 1_004_000)).toBe(false);
  });
});
