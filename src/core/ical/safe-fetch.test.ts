import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateAddress, isSafeCalendarUrl } = await import("./safe-fetch");

describe("calendar address checks", () => {
  it("allows public https hosts only", () => {
    expect(isSafeCalendarUrl("https://admin.booking.com/hotel/ical.ics?t=1")).toBe(true);
    expect(isSafeCalendarUrl("http://example.com/a.ics")).toBe(false);
    expect(isSafeCalendarUrl("https://127.0.0.1/a.ics")).toBe(false);
    expect(isSafeCalendarUrl("https://[::1]/a.ics")).toBe(false);
    expect(isSafeCalendarUrl("https://intranet.local/a.ics")).toBe(false);
    expect(isSafeCalendarUrl("https://user:pw@example.com/a.ics")).toBe(false);
  });
  it("recognises private addresses", () => {
    for (const ip of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.20.1.1",
      "192.168.1.1",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ])
      expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2a00:1450:4001::1"])
      expect(isPrivateAddress(ip), ip).toBe(false);
  });
});
