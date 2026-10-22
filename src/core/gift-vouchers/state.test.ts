import { describe, expect, it } from "vitest";
import { giftDeduction, giftVoucherState, normalizeGiftCode } from "./state";

const v = (over: Partial<Parameters<typeof giftVoucherState>[0]> = {}) => ({
  status: "active",
  amount_cents: 20000,
  balance_cents: 20000,
  valid_until: "2026-12-31",
  ...over,
});

describe("gift vouchers (Z78)", () => {
  it("states: valid, partly used, used up, expired, cancelled", () => {
    expect(giftVoucherState(v(), "2026-10-22")).toBe("valid");
    expect(giftVoucherState(v({ balance_cents: 5000 }), "2026-10-22")).toBe("partial");
    expect(giftVoucherState(v({ balance_cents: 0 }), "2026-10-22")).toBe("used");
    expect(giftVoucherState(v(), "2027-01-01")).toBe("expired");
    expect(giftVoucherState(v({ valid_until: null }), "2030-01-01")).toBe("valid");
    expect(giftVoucherState(v({ status: "cancelled" }), "2026-10-22")).toBe("cancelled");
  });

  it("pays up to the price, the rest stays on the voucher", () => {
    expect(giftDeduction(20000, 50000)).toBe(20000);
    expect(giftDeduction(80000, 50000)).toBe(50000);
    expect(80000 - giftDeduction(80000, 50000)).toBe(30000);
    expect(giftDeduction(0, 50000)).toBe(0);
  });

  it("codes: written in any case and spacing, nonsense refused", () => {
    expect(normalizeGiftCode(" stromy 7k4p 2qxa ")).toBe("STROMY-7K4P-2QXA");
    expect(normalizeGiftCode("STROMY-7K4P2QXA")).toBe("STROMY-7K4P-2QXA");
    expect(normalizeGiftCode("LETO10")).toBeNull();
    expect(normalizeGiftCode("x'; drop")).toBeNull();
  });
});
