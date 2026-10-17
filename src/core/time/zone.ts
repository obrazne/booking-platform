/** Midnight of a calendar day in a time zone, as an instant. */
export function localMidnight(date: string, timeZone: string): Date {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const offset = (at: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return local - at;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}
