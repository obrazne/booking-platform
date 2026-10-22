import { describe, expect, it } from "vitest";
import {
  approvalMethods,
  keepsOneMethod,
  offeredMethods,
  propertyMethods,
  upcomingMethods,
} from "./methods";

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

  it("the inactive card (Pripravujeme) only on staging, never in production (Z71)", () => {
    const s = { bank_transfer_enabled: true, iban: "x" };
    expect(upcomingMethods(s, { EMAIL_REDIRECT_TO: "inbox@example.invalid" })).toEqual(["card"]);
    expect(upcomingMethods(s, {})).toEqual([]);
  });

  it("Z77: the recreation voucher when switched on (needs the account for the rest)", () => {
    expect(offeredMethods({ iban: "x", voucher_enabled: true })).toEqual([
      "bank_transfer",
      "recreation_voucher",
    ]);
    expect(offeredMethods({ iban: null, voucher_enabled: true })).toEqual([]);
    // A voucher alone is not enough — the rest is paid by transfer.
    expect(keepsOneMethod({ bank_transfer_enabled: false, voucher_enabled: true })).toBe(false);
  });

  it("Z77: on approval the card only once blocking and capturing exist", () => {
    expect(approvalMethods(["bank_transfer", "card", "recreation_voucher"])).toEqual([
      "bank_transfer",
      "recreation_voucher",
    ]);
    expect(propertyMethods(["bank_transfer", "card"], false)).toEqual(["bank_transfer", "card"]);
    expect(propertyMethods(["card"], true)).toEqual([]);
  });
});
