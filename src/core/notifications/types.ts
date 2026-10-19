export type BellScope = "tenant" | "platform";

export type NotificationItem = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  target: string | null;
  createdAt: string;
  read: boolean;
};

export type BellData = { items: NotificationItem[]; unread: number };

/**
 * Kinds of notifications (vizuál administrácie v1.2) and whether the same event also comes by e-mail
 * (owner e-mails of the e-mail queue). Shown in Settings → E-maily a upozornenia.
 */
export const TENANT_KINDS = [
  { kind: "reservation_new", email: "yes" },
  { kind: "payment_due", email: "no" },
  { kind: "payment_received", email: "no" },
  { kind: "cancel_request", email: "yes" },
  { kind: "reservation_cancelled", email: "expired" },
  { kind: "portal_booking", email: "no" },
  { kind: "calendar_conflict", email: "yes" },
  { kind: "sync_failed", email: "no" },
  { kind: "trial_ending", email: "no" },
  { kind: "review_new", email: "no", module: "reviews" },
  { kind: "review_publishing", email: "no", module: "reviews" },
  { kind: "order_new", email: "no", module: "upsell" },
  { kind: "order_awaiting", email: "no", module: "upsell" },
  { kind: "checkin_completed", email: "no", module: "checkin" },
  { kind: "foreigner_unreported", email: "no", module: "checkin" },
  { kind: "account_deletion", email: "no" },
  { kind: "message_new", email: "yes", module: "messages" },
] as const;

export const PLATFORM_KINDS = [
  "client_sync_failed",
  "client_emails_failed",
  "client_trial_ending",
  "client_new",
  "backup_stale",
  "support_request",
] as const;
