import { describe, expect, it } from "vitest";
import { fillMessageText, ruleSendAt } from "./rules";

describe("automatic messages (Z45)", () => {
  it("fills in the variables as the database", () => {
    expect(
      fillMessageText("Dobrý deň {meno}, {príchod} – {odchod}. {podpis} {odkaz na hodnotenie}", {
        guestName: " Anna Nová ",
        checkIn: "2026-12-22",
        checkOut: "2026-12-26",
        signature: "Jana",
        reviewLink: "https://x.sk/r",
      }),
    ).toBe("Dobrý deň Anna, 22. 12. 2026 – 26. 12. 2026. Jana https://x.sk/r");
  });

  it("computes when a rule is due in the client's time zone", () => {
    const stay = {
      checkIn: "2026-12-22",
      checkOut: "2026-12-26",
      confirmedAt: "2026-11-01T08:00:00Z",
    };
    const tz = "Europe/Bratislava";
    expect(
      ruleSendAt(
        { anchor: "check_in", offsetDays: -3, sendTime: "10:00" },
        stay,
        tz,
      )?.toISOString(),
    ).toBe("2026-12-19T09:00:00.000Z");
    expect(
      ruleSendAt(
        { anchor: "check_out", offsetDays: 1, sendTime: "11:00" },
        stay,
        tz,
      )?.toISOString(),
    ).toBe("2026-12-27T10:00:00.000Z");
    expect(
      ruleSendAt({ anchor: "confirmed", offsetDays: 0, sendTime: null }, stay, tz)?.toISOString(),
    ).toBe("2026-11-01T08:00:00.000Z");
    expect(
      ruleSendAt(
        { anchor: "confirmed", offsetDays: 0, sendTime: null },
        { ...stay, confirmedAt: null },
        tz,
      ),
    ).toBeNull();
  });
});
