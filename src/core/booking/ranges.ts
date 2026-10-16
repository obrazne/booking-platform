import { addDays } from "@/core/pricing/dates";

/** Expands Postgres date ranges like "[2027-01-10,2027-01-13)" into the list of nights. */
export function expandRanges(ranges: string[]): string[] {
  const out: string[] = [];
  for (const r of ranges) {
    const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(r);
    if (!m) continue;
    for (let d = m[1]!; d < m[2]!; d = addDays(d, 1)) out.push(d);
  }
  return out;
}
