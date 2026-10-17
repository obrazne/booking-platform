import { describe, expect, it } from "vitest";
import {
  dayMode,
  fitsStayAccount,
  guestCanCancel,
  localMidnight,
  orderCutoff,
  orderPrice,
  stayAccount,
} from "./rules";

describe("upsell rules", () => {
  it("prices an order like the cart", () => {
    const stay = { nights: 3, persons: 2 };
    expect(
      orderPrice({ priceModel: "per_person_night", amountCents: 1000, maxQuantity: null }, stay, 1),
    ).toEqual({ items: 1, quantity: 6, amountCents: 6000 });
    expect(
      orderPrice({ priceModel: "per_item", amountCents: 15000, maxQuantity: 2 }, stay, 5),
    ).toEqual({ items: 2, quantity: 2, amountCents: 30000 });
    expect(
      orderPrice({ priceModel: "per_night", amountCents: 500, maxQuantity: null }, stay, 0),
    ).toEqual({ items: 1, quantity: 3, amountCents: 1500 });
  });

  it("prices an order for one day as one night (Z37)", () => {
    const stay = { nights: 3, persons: 2 };
    const breakfast = {
      priceModel: "per_person_night" as const,
      amountCents: 1500,
      maxQuantity: null,
    };
    expect(orderPrice(breakfast, stay, 1, true)).toEqual({
      items: 1,
      quantity: 2,
      amountCents: 3000,
    });
    expect(
      orderPrice({ priceModel: "per_person", amountCents: 6500, maxQuantity: null }, stay, 1, true),
    ).toEqual({ items: 1, quantity: 2, amountCents: 13000 });
  });

  it("picks days by the price model", () => {
    expect(dayMode("per_person_night", false)).toBe("multi");
    expect(dayMode("per_night", true)).toBe("multi");
    expect(dayMode("per_person", true)).toBe("single");
    expect(dayMode("per_stay", false)).toBe("none");
  });

  it("closes ordering the given hours before the local day", () => {
    // Bratislava in winter is UTC+1, in summer UTC+2.
    expect(orderCutoff("2026-12-22", 6, "Europe/Bratislava").toISOString()).toBe(
      "2026-12-21T17:00:00.000Z",
    );
    expect(orderCutoff("2026-07-10", 0, "Europe/Bratislava").toISOString()).toBe(
      "2026-07-09T22:00:00.000Z",
    );
    expect(localMidnight("2026-03-29", "Europe/Bratislava").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
  });

  it("keeps the limit of the stay account", () => {
    expect(fitsStayAccount(6000, 14000, 20000)).toBe(true);
    expect(fitsStayAccount(6000, 14001, 20000)).toBe(false);
  });

  it("lets the guest cancel only before the cutoff and before payment", () => {
    const now = new Date("2026-10-17T10:00:00Z");
    const order = { status: "confirmed", paidAt: null, cutoffAt: "2026-10-17T12:00:00Z" };
    expect(guestCanCancel(order, now)).toBe(true);
    expect(guestCanCancel({ ...order, cutoffAt: "2026-10-17T09:00:00Z" }, now)).toBe(false);
    expect(guestCanCancel({ ...order, paidAt: "2026-10-16T09:00:00Z" }, now)).toBe(false);
    expect(guestCanCancel({ ...order, status: "declined" }, now)).toBe(false);
  });

  it("sums the stay account", () => {
    expect(
      stayAccount([
        { status: "confirmed", amountCents: 6000, paidAt: "2026-10-17" },
        { status: "awaiting_confirmation", amountCents: 3000, paidAt: null },
        { status: "declined", amountCents: 30000, paidAt: null },
      ]),
    ).toEqual({ total: 9000, paid: 6000, open: 3000 });
  });
});
