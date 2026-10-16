/** Minimal iCalendar (RFC 5545) reading and writing for availability sync with Booking.com and Airbnb (B2). */

export type IcalEvent = { uid: string; start: string; end: string; summary: string };

function unfold(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/);
}

/** YYYYMMDD or YYYYMMDDTHHMMSS(Z) → YYYY-MM-DD (date part; OTA calendars use whole days). */
function toDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

export function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Partial<IcalEvent> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current?.start) {
        const start = current.start;
        // All-day events without DTEND last one day.
        const end = current.end && current.end > start ? current.end : nextDay(start);
        events.push({
          uid: current.uid ?? `${start}-${end}`,
          start,
          end,
          summary: current.summary ?? "",
        });
      }
      current = null;
    } else if (current) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const name = line.slice(0, i).split(";")[0]!.toUpperCase();
      const value = line.slice(i + 1);
      if (name === "UID") current.uid = value.trim();
      else if (name === "DTSTART") current.start = toDate(value) ?? undefined;
      else if (name === "DTEND") current.end = toDate(value) ?? undefined;
      else if (name === "SUMMARY") current.summary = unescapeText(value);
    }
  }
  return events;
}

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

const compact = (date: string) => date.replaceAll("-", "");

/** Calendar with all-day busy events; no guest data (only "busy" in the summary). */
export function buildIcal(input: {
  name: string;
  events: { uid: string; start: string; end: string; summary: string }[];
  stamp?: Date;
}): string {
  const stamp = (input.stamp ?? new Date())
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking platform//Availability//SK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(input.name)}`,
    ...input.events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${esc(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${esc(e.summary)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
