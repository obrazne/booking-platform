/**
 * Register of pages and settings for the search (Z67, vizuál administrácie v1.5, doska 15). One row per page or field:
 * a new page or a new setting = a new row here (and its words in `search.entries.<id>` of the translations — title,
 * where it is, synonyms). `field` = id (or name) of the field the page highlights after the click (`?hl=`).
 * `{property}` in the address = the only property, or the list of properties when there are more.
 * Pages of modules join by themselves (their menu items); `module` = the row only with the module switched on.
 */
export type RegistryEntry = {
  id: string;
  href: string;
  field?: string;
  module?: string;
  /** Only when the client has a portal calendar connected / ever had a collision (as the menu). */
  when?: "portals" | "collisions";
};

export const ADMIN_REGISTRY: readonly RegistryEntry[] = [
  { id: "overview", href: "/admin" },
  { id: "reservations", href: "/admin/reservations" },
  { id: "guests", href: "/admin/guests" },
  { id: "newReservation", href: "/admin/reservations/new" },
  { id: "calendar", href: "/admin/calendar" },
  { id: "blocks", href: "/admin/blocks" },
  { id: "portalStays", href: "/admin/portal-stays", when: "portals" },
  { id: "collisions", href: "/admin/collisions", when: "collisions" },
  { id: "statistics", href: "/admin/statistics" },
  { id: "report", href: "/admin/statistics/report" },
  { id: "ical", href: "/admin/ical" },
  { id: "testimonials", href: "/admin/testimonials" },
  { id: "help", href: "/admin/help" },
  // Objekt
  { id: "propertyData", href: "/admin/properties/{property}" },
  { id: "propertyName", href: "/admin/properties/{property}", field: "name" },
  { id: "maxGuests", href: "/admin/properties/{property}", field: "max_guests" },
  { id: "checkInTimes", href: "/admin/properties/{property}", field: "check_in_from" },
  { id: "cleaningGap", href: "/admin/properties/{property}", field: "cleaning_gap_days" },
  { id: "houseRules", href: "/admin/properties/{property}", field: "house_rules" },
  { id: "pets", href: "/admin/properties/{property}", field: "pets_allowed" },
  { id: "wifi", href: "/admin/properties/{property}", field: "wifi_name" },
  { id: "doorCode", href: "/admin/properties/{property}", field: "door_code" },
  { id: "photos", href: "/admin/properties/{property}/photos" },
  { id: "pricing", href: "/admin/properties/{property}/pricing" },
  { id: "page", href: "/admin/properties/{property}/page" },
  { id: "documents", href: "/admin/properties/{property}/documents" },
  // Nastavenia
  { id: "settings", href: "/admin/settings" },
  { id: "iban", href: "/admin/settings", field: "iban" },
  { id: "accountHolder", href: "/admin/settings", field: "account_holder" },
  { id: "paymentDue", href: "/admin/settings", field: "payment_due_hours" },
  { id: "holdMinutes", href: "/admin/settings", field: "hold_minutes" },
  { id: "commission", href: "/admin/settings", field: "portal_commission_bp" },
  { id: "cancellation", href: "/admin/settings", field: "cancellation_policy" },
  { id: "terms", href: "/admin/settings", field: "terms_url" },
  { id: "privacy", href: "/admin/settings", field: "privacy_url" },
  { id: "contact", href: "/admin/settings", field: "contact_phone" },
  { id: "whatsapp", href: "/admin/settings", field: "whatsapp_phone" },
  { id: "signature", href: "/admin/settings", field: "message_signature" },
  { id: "accountant", href: "/admin/settings", field: "accountant_email" },
  { id: "ownerEmail", href: "/admin/settings", field: "owner_notification_email" },
  { id: "arrivalEmail", href: "/admin/settings", field: "arrival_email_days_before" },
  {
    id: "stayAccountLimit",
    href: "/admin/settings",
    field: "stay_account_limit",
    module: "upsell",
  },
  { id: "upsellDays", href: "/admin/settings", field: "upsell_offer_days", module: "upsell" },
  { id: "messageTopics", href: "/admin/settings", field: "message_topics", module: "messages" },
  { id: "googleReview", href: "/admin/settings", field: "google_review_url", module: "reviews" },
  { id: "cityTax", href: "/admin/settings", field: "city_tax", module: "checkin" },
  {
    id: "checkinRetention",
    href: "/admin/settings",
    field: "checkin_retention_days",
    module: "checkin",
  },
  { id: "team", href: "/admin/team" },
  { id: "notifications", href: "/admin/settings/notifications" },
  { id: "trash", href: "/admin/settings/trash" },
];

/** Control center: its pages (clients are searched in the database). */
export const PLATFORM_REGISTRY: readonly RegistryEntry[] = [
  { id: "pClients", href: "/platform" },
  { id: "pNewClient", href: "/platform/new" },
  { id: "pCatalog", href: "/platform/modules" },
  { id: "pTrials", href: "/platform/modules/trials" },
  { id: "pStatus", href: "/platform/status" },
  { id: "pBackups", href: "/platform/status#backups-title" },
  { id: "pAudit", href: "/platform/audit" },
  { id: "pNotifications", href: "/platform/notifications" },
  { id: "pSupport", href: "/platform/support" },
];

/** Address of a row with the field to highlight. */
export function entryHref(e: Pick<RegistryEntry, "href" | "field">, property: string): string {
  const href = e.href.replace("{property}", property);
  if (!e.field) return href;
  const [path, hash] = href.split("#");
  return `${path}${path!.includes("?") ? "&" : "?"}hl=${e.field}${hash ? `#${hash}` : ""}`;
}

/** Lower case without diacritics — "Upratovanie" = "upratovanie" = "upratovanie". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Does the text match the query? Every word of the query must start a word of the text ("uprat" finds
 * "Upratovacie dni"); a word of 4+ letters may also be inside a word ("blok" in "odblokovať").
 */
export function matches(text: string, query: string): number {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const hay = fold(text);
  const starts = hay.split(/[^a-z0-9]+/).filter(Boolean);
  let score = 0;
  for (const w of words) {
    if (starts.some((s) => s.startsWith(w))) score += 2;
    else if (w.length >= 4 && hay.includes(w)) score += 1;
    else return 0;
  }
  return score;
}
