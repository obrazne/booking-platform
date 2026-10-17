import { describe, expect, it } from "vitest";
import { bandsToJson, cancellationOutcome, parseBands } from "./cancellation";

describe("storno bands", () => {
  const bands = parseBands([
    { days: 14, refund_pct: 50 },
    { days: 30, refund_pct: 100 },
    { days: -1, refund_pct: 10 },
    { days: 7, refund_pct: 120 },
  ]);

  it("keeps valid bands, the earliest first", () => {
    expect(bands).toEqual([
      { days: 30, refundPct: 100 },
      { days: 14, refundPct: 50 },
    ]);
    expect(bandsToJson(bands)).toEqual([
      { days: 30, refund_pct: 100 },
      { days: 14, refund_pct: 50 },
    ]);
    expect(parseBands(null)).toEqual([]);
  });

  it("calculates the fee and the refund of what was paid", () => {
    expect(cancellationOutcome(bands, 45, 445000, 445000)).toEqual({
      refundPct: 100,
      feeCents: 0,
      refundCents: 445000,
    });
    expect(cancellationOutcome(bands, 14, 445000, 445000)).toEqual({
      refundPct: 50,
      feeCents: 222500,
      refundCents: 222500,
    });
    expect(cancellationOutcome(bands, 3, 445000, 445000)).toEqual({
      refundPct: 0,
      feeCents: 445000,
      refundCents: 0,
    });
    // Nothing paid yet: nothing to return.
    expect(cancellationOutcome(bands, 20, 30000, 0)?.refundCents).toBe(0);
    // No bands: the owner decides by the wording.
    expect(cancellationOutcome([], 20, 30000, 30000)).toBeNull();
  });
});
