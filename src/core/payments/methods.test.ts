import { describe, expect, it } from "vitest";
import { keepsOneMethod, offeredMethods } from "./methods";

describe("payment methods (Z69)", () => {
  it("offers the bank transfer when it is on and has an account", () => {
    expect(offeredMethods({ bank_transfer_enabled: true, iban: "SK31…" })).toEqual([
      "bank_transfer",
    ]);
    expect(offeredMethods({ bank_transfer_enabled: true, iban: null })).toEqual([]);
  });

  it("never offers card payments yet, even when switched on with an account", () => {
    expect(
      offeredMethods({
        bank_transfer_enabled: true,
        iban: "x",
        card_enabled: true,
        stripe_account_id: "acct_123456",
      }),
    ).toEqual(["bank_transfer"]);
  });

  it("at least one method stays on", () => {
    expect(keepsOneMethod({ bank_transfer_enabled: false, card_enabled: false })).toBe(false);
    expect(keepsOneMethod({ bank_transfer_enabled: true })).toBe(true);
    expect(keepsOneMethod({})).toBe(true);
  });
});
