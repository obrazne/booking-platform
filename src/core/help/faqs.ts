/**
 * Pomoc (Z67, vizuál administrácie v1.5, doska 16): questions with steps, versioned in code; the words are in the
 * translations (`help.faqs.<id>`: q, steps[], go). Answers say what the system really does — check them when the
 * behaviour changes (list for Martin: docs/pomoc-otazky.md). Modules add their own through the manifest (`helpFaqs`,
 * words in `<module namespace>.help.<id>`), shown only with the module on. The ⓘ hints (Z66) link `helpHref(id)`.
 */
export const HELP_TOPICS = ["calendar", "payments", "pricing", "guests", "settings"] as const;
export type HelpTopic = (typeof HELP_TOPICS)[number];

export type HelpFaq = {
  id: string;
  topic: HelpTopic;
  /** The page the button "Otvoriť …" leads to; `{property}` as in the search register. */
  href: string;
  /** Field to highlight there (`?hl=`). */
  field?: string;
  /** Only with this module switched on (core questions about a module's screens). */
  module?: string;
};

export const CORE_FAQS: readonly HelpFaq[] = [
  { id: "blockDates", topic: "calendar", href: "/admin/blocks" },
  { id: "connectPortal", topic: "calendar", href: "/admin/ical" },
  { id: "collision", topic: "calendar", href: "/admin/collisions" },
  { id: "portalGuests", topic: "calendar", href: "/admin/portal-stays" },
  { id: "transferPaid", topic: "payments", href: "/admin/reservations" },
  { id: "unpaid", topic: "payments", href: "/admin/settings", field: "payment_due_hours" },
  { id: "iban", topic: "payments", href: "/admin/settings", field: "iban" },
  { id: "cancelRequest", topic: "payments", href: "/admin/settings", field: "cancellation_policy" },
  { id: "seasonPrice", topic: "pricing", href: "/admin/properties/{property}/pricing" },
  {
    id: "cleaningGap",
    topic: "pricing",
    href: "/admin/properties/{property}",
    field: "cleaning_gap_days",
  },
  { id: "phoneBooking", topic: "guests", href: "/admin/reservations/new" },
  {
    id: "arrivalInfo",
    topic: "guests",
    href: "/admin/settings",
    field: "arrival_email_days_before",
  },
  { id: "monthlyReport", topic: "settings", href: "/admin/statistics/report" },
  { id: "team", topic: "settings", href: "/admin/team" },
  {
    id: "pushPhone",
    topic: "settings",
    href: "/admin/settings/notifications",
    module: "push",
  },
  { id: "deleted", topic: "settings", href: "/admin/settings/trash" },
];

/** Address of a question in Pomoc — for the ⓘ hints and the search. */
export function helpHref(id: string): string {
  return `/admin/help?open=${encodeURIComponent(id)}`;
}
