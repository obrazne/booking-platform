import { describe, expect, it } from "vitest";
import { buildIcal, icalDetails, parseIcal } from "./ical";

const airbnb = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20270108",
  "DTSTART;VALUE=DATE:20270105",
  "UID:1418fb94e984-abc@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMXXXX\\nPhone Number (Last",
  "  4 Digits): 1234",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20270210T140000Z",
  "DTEND:20270212T100000Z",
  "UID:booking-77",
  "SUMMARY:CLOSED - Not available",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20270301",
  "UID:single-day",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcal", () => {
  it("reads all-day and timed events, folded lines and missing DTEND", () => {
    expect(parseIcal(airbnb)).toEqual([
      {
        uid: "1418fb94e984-abc@airbnb.com",
        start: "2027-01-05",
        end: "2027-01-08",
        summary: "Reserved",
        details: {
          url: "https://www.airbnb.com/hosting/reservations/details/HMXXXX",
          code: "HMXXXX",
          phone4: "1234",
        },
      },
      {
        uid: "booking-77",
        start: "2027-02-10",
        end: "2027-02-12",
        summary: "CLOSED - Not available",
      },
      { uid: "single-day", start: "2027-03-01", end: "2027-03-02", summary: "" },
    ]);
  });
});

describe("icalDetails", () => {
  it("keeps only the link, the code and the phone's last digits", () => {
    expect(icalDetails("Booking number: 4567890123\nGuest: Ján Novák")).toEqual({
      code: "4567890123",
    });
    expect(icalDetails("Nič užitočné")).toBeUndefined();
  });
});

describe("buildIcal", () => {
  it("writes all-day events that round-trip", () => {
    const text = buildIcal({
      name: "Chalet; test",
      events: [{ uid: "r1", start: "2027-01-05", end: "2027-01-08", summary: "Obsadené" }],
      stamp: new Date("2026-10-16T12:00:00Z"),
    });
    expect(text).toContain("DTSTART;VALUE=DATE:20270105\r\n");
    expect(text).toContain("X-WR-CALNAME:Chalet\\; test\r\n");
    expect(parseIcal(text)).toEqual([
      { uid: "r1", start: "2027-01-05", end: "2027-01-08", summary: "Obsadené" },
    ]);
  });
});
