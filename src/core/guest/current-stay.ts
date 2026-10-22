/**
 * The guest's current stay (Z59): the one going on (arrived, not left), else the nearest coming one; cancelled and
 * completed stays never. Also the stay after a given one (the switcher "Ďalší pobyt").
 */
type StayLike = { id: string; status: string; checkIn: string; checkOut: string };

const UPCOMING = new Set(["awaiting_approval", "pending_payment", "confirmed", "in_progress"]);

export function upcomingStays<S extends StayLike>(stays: S[], today: string): S[] {
  return stays
    .filter((s) => UPCOMING.has(s.status) && s.checkOut > today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

export function currentStay<S extends StayLike>(stays: S[], today: string): S | null {
  const list = upcomingStays(stays, today);
  return list.find((s) => s.checkIn <= today) ?? list[0] ?? null;
}

export function nextStayAfter<S extends StayLike>(stays: S[], id: string, today: string): S | null {
  const list = upcomingStays(stays, today);
  const i = list.findIndex((s) => s.id === id);
  return i >= 0 ? (list[i + 1] ?? null) : null;
}
