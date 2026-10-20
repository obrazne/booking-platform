/**
 * "Pridať do kalendára" (Z72): the stay as an event — Google Calendar and Outlook as links (no API, no keys) and the
 * same event as an .ics file for Apple and other calendars. Arrival (check-in from) → departure (check-out until) in
 * the client's time zone; without the times an all-day event over the nights. Never door codes or the Wi-Fi.
 */
export type StayEvent = {
  title: string;
  description: string;
  /** Exact address only when the owner shows the place; otherwise null. */
  location: string | null;
  link: string;
  checkIn: string;
  checkOut: string;
  /** "15:00" — from the property; null = all-day. */
  checkInFrom: string | null;
  checkOutUntil: string | null;
  timeZone: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Offset of a time zone at a moment, in minutes (Europe/Bratislava in summer = 120). */
function offsetMinutes(utc: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);
  const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((local - utc.getTime()) / 60000);
}

/** A local date and time of the client's zone as the moment in UTC (summer / winter time handled). */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  // Two passes: the offset of the guess, then of the corrected moment (around the change of the time).
  let utc = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  utc = guess - offsetMinutes(new Date(utc), timeZone) * 60000;
  return new Date(utc);
}

const basic = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const day = (iso: string) => iso.replaceAll("-", "");

/** Start and end: moments with times, or all-day dates (the end is the day of departure, as the nights end). */
export function eventSpan(
  e: StayEvent,
): { allDay: false; start: Date; end: Date } | { allDay: true; start: string; end: string } {
  if (e.checkInFrom && e.checkOutUntil)
    return {
      allDay: false,
      start: zonedToUtc(e.checkIn, e.checkInFrom, e.timeZone),
      end: zonedToUtc(e.checkOut, e.checkOutUntil, e.timeZone),
    };
  return { allDay: true, start: e.checkIn, end: e.checkOut };
}

const details = (e: StayEvent) => `${e.description}\n${e.link}`;

export function googleCalendarUrl(e: StayEvent): string {
  const s = eventSpan(e);
  const dates = s.allDay ? `${day(s.start)}/${day(s.end)}` : `${basic(s.start)}/${basic(s.end)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: details(e) });
  if (e.location) q.set("location", e.location);
  if (!s.allDay) q.set("ctz", e.timeZone);
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookCalendarUrl(e: StayEvent): string {
  const s = eventSpan(e);
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: s.allDay ? s.start : s.start.toISOString().replace(/\.\d{3}Z$/, "Z"),
    enddt: s.allDay ? s.end : s.end.toISOString().replace(/\.\d{3}Z$/, "Z"),
    allday: String(s.allDay),
    body: details(e),
  });
  if (e.location) q.set("location", e.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q}`;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** The .ics file (Apple / other calendars): the same event, times in UTC. */
export function icsFile(e: StayEvent, uid: string, now = new Date()): string {
  const s = eventSpan(e);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//booking-platform//stay//SK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${basic(now)}`,
    ...(s.allDay
      ? [`DTSTART;VALUE=DATE:${day(s.start)}`, `DTEND;VALUE=DATE:${day(s.end)}`]
      : [`DTSTART:${basic(s.start)}`, `DTEND:${basic(s.end)}`]),
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(details(e))}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    `URL:${e.link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
