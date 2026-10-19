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
  /** Only for clients with this module on (its page would not exist otherwise). */
  module?: string;
};

export type Tour = { key: TourKey; version: string; slides: readonly TourSlide[] };

export const TOURS: Record<TourKey, Tour> = {
  owner: {
    key: "owner",
    version: "2026-10-18.1",
    slides: [
      // New before the demo for Jana (Z53) first: modules, collisions, storno bands, basis for the document.
      { id: "messages", href: "/admin/messages", module: "messages" },
      { id: "autoMessages", href: "/admin/messages/auto", module: "messages" },
      { id: "checkin", href: "/admin/arrivals", module: "checkin" },
      { id: "upsell", href: "/admin/reservations", module: "upsell" },
      { id: "reviews", href: "/admin/reviews", module: "reviews" },
      { id: "collisions", href: "/admin/collisions" },
      { id: "storno", href: "/admin/settings" },
      { id: "invoice", href: "/admin/reservations" },
      // v1.2: menu with groups, Statistics, bell.
      { id: "menu", href: "/admin" },
      { id: "statistics", href: "/admin/statistics" },
      { id: "notifications", href: "/admin/settings?tab=upozornenia" },
      { id: "dashboard", href: "/admin" },
      { id: "reservations", href: "/admin/reservations" },
      { id: "payment", href: "/admin/reservations?status=pending_payment" },
      { id: "calendar", href: "/admin/calendar" },
      { id: "manual", href: "/admin/reservations/new" },
      { id: "property", href: "/admin/properties" },
      { id: "services", href: "/admin/services" },
      { id: "ical", href: "/admin/settings?tab=prepojenia" },
      { id: "settings", href: "/admin/settings" },
    ],
  },
  admin: {
    key: "admin",
    version: "2026-10-17.5",
    slides: [
      { id: "tenants", href: "/platform" },
      { id: "newTenant", href: "/platform/new" },
      { id: "detail", href: "/platform" },
      { id: "modules", href: "/platform/modules" },
      { id: "health", href: "/platform/status" },
      { id: "theme", href: "/platform" },
      { id: "audit", href: "/platform/audit" },
      { id: "ownerView", href: "/platform" },
    ],
  },
};

export const tourImage = (key: TourKey, slide: string) => `/tours/${key}/${slide}.jpg`;

/** True when the user has not seen this version of the tour yet. */
export function tourIsNew(key: TourKey, seen: unknown): boolean {
  const map = seen && typeof seen === "object" ? (seen as Record<string, unknown>) : {};
  return map[key] !== TOURS[key].version;
}
