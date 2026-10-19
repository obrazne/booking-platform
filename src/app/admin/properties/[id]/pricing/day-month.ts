/** Day and month of a yearly season range (Z56): shown as "23. 12.", stored in the year 2000 (a leap year, so 29. 2. fits). */

/** "2000-12-23" → "23. 12."; empty for an empty value. */
export function dayMonthText(iso: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[2])}. ${Number(m[1])}.` : "";
}

/** "23. 12." / "23.12" / "23 12" → "2000-12-23"; null when it is not a day of the year. */
export function parseDayMonth(text: string): string | null {
  const m = /^\s*(\d{1,2})\s*[.\s/]\s*(\d{1,2})\s*\.?\s*$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const iso = `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
