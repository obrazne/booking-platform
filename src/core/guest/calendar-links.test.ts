import { describe, expect, it } from "vitest";
import {
  googleCalendarUrl,
  icsFile,
  outlookCalendarUrl,
  zonedToUtc,
  type StayEvent,
} from "./calendar-links";

const event: StayEvent = {
  title: "Pobyt — Chalet Pod Smrekom",
  description: "Rezervácia 2026-0042",
  location: "Liptovský Ján 12, 032 03",
  link: "https://ukazka.example.invalid/r/abc",
  checkIn: "2026-10-16",
  checkOut: "2026-10-20",
  checkInFrom: "15:00",
  checkOutUntil: "10:00",
  timeZone: "Europe/Bratislava",
};

describe("add to calendar (Z72)", () => {
  it("local times of the client's zone, summer and winter time", () => {
    expect(zonedToUtc("2026-07-01", "15:00", "Europe/Bratislava").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
    expect(zonedToUtc("2026-12-01", "15:00", "Europe/Bratislava").toISOString()).toBe(
      "2026-12-01T14:00:00.000Z",
    );
    // The night of the change of time (25. 10. 2026): arrival before, departure after.
    expect(zonedToUtc("2026-10-25", "10:00", "Europe/Bratislava").toISOString()).toBe(
      "2026-10-25T09:00:00.000Z",
    );
  });

  it("Google: dates, zone, encoded words", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Pobyt — Chalet Pod Smrekom");
    expect(url.searchParams.get("dates")).toBe("20261016T130000Z/20261020T080000Z");
    expect(url.searchParams.get("ctz")).toBe("Europe/Bratislava");
    expect(url.searchParams.get("location")).toBe("Liptovský Ján 12, 032 03");
    expect(url.searchParams.get("details")).toContain("https://ukazka.example.invalid/r/abc");
    expect(googleCalendarUrl(event)).not.toContain(" ");
  });

  it("Outlook: start and end as moments", () => {
    const url = new URL(outlookCalendarUrl(event));
    expect(url.searchParams.get("startdt")).toBe("2026-10-16T13:00:00Z");
    expect(url.searchParams.get("enddt")).toBe("2026-10-20T08:00:00Z");
    expect(url.searchParams.get("allday")).toBe("false");
    expect(url.searchParams.get("subject")).toBe("Pobyt — Chalet Pod Smrekom");
  });

  it("without the times an all-day event; without the place no location", () => {
    const allDay = { ...event, checkInFrom: null, location: null };
    expect(new URL(googleCalendarUrl(allDay)).searchParams.get("dates")).toBe("20261016/20261020");
    expect(new URL(googleCalendarUrl(allDay)).searchParams.has("location")).toBe(false);
    expect(new URL(outlookCalendarUrl(allDay)).searchParams.get("allday")).toBe("true");
    expect(icsFile(allDay, "x")).toContain("DTSTART;VALUE=DATE:20261016");
  });

  it(".ics: the same event, commas and lines escaped", () => {
    const ics = icsFile(event, "r1@booking-platform", new Date("2026-10-01T00:00:00Z"));
    expect(ics).toContain("DTSTART:20261016T130000Z\r\nDTEND:20261020T080000Z");
    expect(ics).toContain("LOCATION:Liptovský Ján 12\\, 032 03");
    expect(ics).toContain(
      "DESCRIPTION:Rezervácia 2026-0042\\nhttps://ukazka.example.invalid/r/abc",
    );
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
