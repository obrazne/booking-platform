/** Fixed reasons a review may be rejected for (B11) — the guest gets the reason by e-mail. */
export const REJECT_REASONS = ["profanity", "personal_data", "unrelated", "spam"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const REVIEW_STATUSES = ["submitted", "published", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const PARTIAL_RATINGS = ["cleanliness", "location", "communication", "value"] as const;

/** Hours after submission when a review is published unless the owner acts (the database does it). */
export const AUTO_PUBLISH_HOURS = 72;

export function publishesAt(submittedAt: string): Date {
  return new Date(new Date(submittedAt).getTime() + AUTO_PUBLISH_HOURS * 3_600_000);
}

/** What the owner can do with a review in each state. */
export function reviewActions(status: ReviewStatus): { publish: boolean; reject: boolean } {
  return { publish: status !== "published", reject: status !== "rejected" };
}

/** Name shown with a review by default: "Jana Nováková" → "Jana N." (the same rule as the database). */
export function reviewDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 60);
  return `${parts[0]!.slice(0, 56)} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

/** Stars as text for lists, e.g. 4 → "★★★★☆". */
export function stars(rating: number): string {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}
