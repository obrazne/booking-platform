/** Minimal iCalendar (RFC 5545) reading and writing for availability sync with Booking.com and Airbnb (B2). */

/**
 * What a portal says about its stay in the description (Z58): the link or code of the reservation and the last four
 * digits of the guest's phone (Airbnb). Nothing else of the description is kept.
 */
export type IcalDetails = { url?: string; code?: string; phone4?: string };

export type IcalEvent = {
  uid: string;
  start: string;
  end: string;
  summary: string;
  details?: IcalDetails;
};

/** The reservation's link, code and the phone's last digits from a portal's DESCRIPTION (Airbnb, Booking…). */
export function icalDetails(description: string): IcalDetails | undefined {
  const text = description.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
  const url = /https?:\/\/[^\s"<>]+/.exec(text)?.[0];
  const code =
    /reservations\/details\/([A-Z0-9]{6,})/i.exec(text)?.[1] ??
    /(?:reservation|booking)\s*(?:code|number|id)\s*[:#]\s*([A-Z0-9-]{5,})/i.exec(text)?.[1];
  const phone4 = /last\s*4\s*digits\)?\s*:\s*(\d{4})/i.exec(text)?.[1];
  const details: IcalDetails = {};
  if (url) details.url = url.slice(0, 300);
  if (code) details.code = code.slice(0, 40);
  if (phone4) details.phone4 = phone4;
  return Object.keys(details).length ? details : undefined;
}

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
          ...(current.details ? { details: current.details } : {}),
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
      else if (name === "DESCRIPTION") current.details = icalDetails(value);
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
