import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isReservedRecipient } = await import("./send");

describe("isReservedRecipient", () => {
  it("skips test domains", () => {
    expect(isReservedRecipient("e2e@booking-platform.test")).toBe(true);
    expect(isReservedRecipient("a@example.com")).toBe(true);
    expect(isReservedRecipient("a@mail.example.org")).toBe(true);
  });
  it("keeps real domains", () => {
    expect(isReservedRecipient("info@obrazne.sk")).toBe(false);
    expect(isReservedRecipient("jana@example-chalet.sk")).toBe(false);
  });
});
