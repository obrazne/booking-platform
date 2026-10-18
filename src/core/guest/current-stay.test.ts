import { describe, expect, it } from "vitest";
import { currentStay, nextStayAfter } from "./current-stay";

const s = (id: string, status: string, checkIn: string, checkOut: string) => ({
  id,
  status,
  checkIn,
  checkOut,
});
const today = "2026-10-18";

describe("currentStay", () => {
  it("the stay going on wins over a coming one", () => {
    const stays = [
      s("future", "confirmed", "2026-11-01", "2026-11-04"),
      s("now", "in_progress", "2026-10-16", "2026-10-20"),
    ];
    expect(currentStay(stays, today)?.id).toBe("now");
  });
  it("else the nearest coming one, also waiting for payment", () => {
    const stays = [
      s("later", "confirmed", "2027-02-12", "2027-02-15"),
      s("soon", "pending_payment", "2026-12-01", "2026-12-03"),
      s("past", "completed", "2026-08-01", "2026-08-03"),
      s("cancelled", "cancelled", "2026-10-25", "2026-10-27"),
    ];
    expect(currentStay(stays, today)?.id).toBe("soon");
    expect(nextStayAfter(stays, "soon", today)?.id).toBe("later");
    expect(nextStayAfter(stays, "later", today)).toBeNull();
  });
  it("none without a coming stay; the day of departure is over", () => {
    expect(currentStay([s("left", "confirmed", "2026-10-15", "2026-10-18")], today)).toBeNull();
    expect(currentStay([], today)).toBeNull();
  });
});
