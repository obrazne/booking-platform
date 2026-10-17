/**
 * "What's new" tours (A15, Z22). Versioned data in code: raise `version` when the slides change and every user sees the
 * tour once more after signing in. Texts live in the translations (`tours.<key>.<slide>.title|body`), screenshots in
 * `public/tours/<key>/<slide>.jpg` — made from the demo data by `npm run tour:screens`.
 */
export type TourKey = "owner" | "admin";

export type TourSlide = {
  id: string;
  /** Page "Show me" opens. */
  href: string;
};

export type Tour = { key: TourKey; version: string; slides: readonly TourSlide[] };

export const TOURS: Record<TourKey, Tour> = {
  owner: {
    key: "owner",
    version: "2026-10-17.2",
    slides: [
      { id: "dashboard", href: "/admin" },
      { id: "reservations", href: "/admin/reservations" },
      { id: "payment", href: "/admin/reservations?status=pending_payment" },
      { id: "calendar", href: "/admin/calendar" },
      { id: "manual", href: "/admin/reservations/new" },
      { id: "property", href: "/admin/properties" },
      { id: "pricing", href: "/admin/properties" },
      { id: "services", href: "/admin/services" },
      { id: "documents", href: "/admin/properties" },
      { id: "ical", href: "/admin/ical" },
      { id: "settings", href: "/admin/settings" },
    ],
  },
  admin: {
    key: "admin",
    version: "2026-10-17.2",
    slides: [
      { id: "tenants", href: "/platform" },
      { id: "newTenant", href: "/platform/new" },
      { id: "detail", href: "/platform" },
      { id: "modules", href: "/platform" },
      { id: "health", href: "/platform" },
      { id: "theme", href: "/platform" },
      { id: "audit", href: "/platform" },
      { id: "ownerView", href: "/admin" },
    ],
  },
};

export const tourImage = (key: TourKey, slide: string) => `/tours/${key}/${slide}.jpg`;

/** True when the user has not seen this version of the tour yet. */
export function tourIsNew(key: TourKey, seen: unknown): boolean {
  const map = seen && typeof seen === "object" ? (seen as Record<string, unknown>) : {};
  return map[key] !== TOURS[key].version;
}
