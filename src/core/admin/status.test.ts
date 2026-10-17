import { describe, expect, it } from "vitest";
import { occupancyOfReservation } from "./status";

describe("occupancy colours", () => {
  it("portals are grey-blue, waiting for payment warm, the rest direct", () => {
    expect(occupancyOfReservation("confirmed", "booking")).toBe("portal");
    expect(occupancyOfReservation("pending_payment", "airbnb")).toBe("portal");
    expect(occupancyOfReservation("pending_payment", "direct")).toBe("pending");
    expect(occupancyOfReservation("confirmed", "manual")).toBe("direct");
    expect(occupancyOfReservation("in_progress", "direct")).toBe("direct");
  });
});
