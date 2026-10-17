import { describe, expect, it } from "vitest";
import { stayPhase, stayStateOf } from "./stay-state";

describe("stay phase (Z44)", () => {
  it("follows the state and the dates", () => {
    const t = "2026-12-22";
    expect(stayPhase("pending_payment", "2026-12-30", "2027-01-02", t)).toBe("pending");
    expect(stayPhase("confirmed", "2026-12-30", "2027-01-02", t)).toBe("before");
    expect(stayPhase("confirmed", "2026-12-22", "2026-12-25", t)).toBe("during");
    expect(stayPhase("in_progress", "2026-12-20", "2026-12-22", t)).toBe("during");
    expect(stayPhase("confirmed", "2026-12-18", "2026-12-21", t)).toBe("after");
    expect(stayPhase("completed", "2026-12-18", "2026-12-21", t)).toBe("after");
    expect(stayPhase("cancelled", "2026-12-30", "2027-01-02", t)).toBe("cancelled");
  });

  it("reads the state from the database or gives up", () => {
    expect(stayStateOf(null)).toBeNull();
    const s = stayStateOf({
      arrival: {
        visible: false,
        from: "2026-12-19",
        needs_payment: false,
        needs_checkin: true,
        check_in_from: "15:00",
        check_out_until: "10:00",
        instructions: null,
        door_code: null,
        wifi_name: null,
        wifi_password: null,
      },
      cancelled_at: null,
      cancelled_reason: null,
      refunded_cents: 0,
    });
    expect(s?.arrival.needsCheckin).toBe(true);
    expect(s?.arrival.from).toBe("2026-12-19");
  });
});
