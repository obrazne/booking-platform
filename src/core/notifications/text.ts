/** Kinds with their own texts in `notifications.kinds.*`; anything else uses `other`. */
export const NOTIFICATION_KINDS = [
  "reservation_new",
  "payment_due",
  "payment_received",
  "cancel_request",
  "reservation_cancelled",
  "portal_booking",
  "calendar_conflict",
  "sync_failed",
  "trial_ending",
  "client_sync_failed",
  "client_emails_failed",
  "client_trial_ending",
  "client_new",
] as const;

type Translate = ((key: string, args?: Record<string, string | number>) => string) & {
  has?: (key: string) => boolean;
};

/**
 * Title and line of a notification — the same in the bell and in a push (Z33). `t` is bound to `notifications`,
 * `tAll` to the root (module names). Only the guest's name and the dates of the stay, nothing else personal.
 */
export function notificationText(
  n: { kind: string; data: Record<string, unknown> },
  t: Translate,
  tAll: Translate,
  locale: string,
): { title: string; body: string } {
  const d = n.data;
  const money = (cents: unknown, currency: unknown) =>
    typeof cents === "number"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: typeof currency === "string" ? currency : "EUR",
          maximumFractionDigits: 0,
        }).format(cents / 100)
      : "";
  const date = (iso: unknown) =>
    typeof iso === "string"
      ? new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso))
      : "";
  const moduleKey = typeof d.module === "string" ? `modules.${d.module}.nav` : "";
  const moduleName = moduleKey && tAll.has?.(moduleKey) ? tAll(moduleKey) : String(d.module ?? "");
  const args = {
    number: String(d.number ?? ""),
    guest: String(d.guest ?? ""),
    stay: d.check_in ? `${date(d.check_in)} – ${date(d.check_out)}` : "",
    amount: money(d.total_cents, d.currency),
    due: date(d.due_at),
    channel: String(d.channel ?? ""),
    tenant: String(d.tenant ?? ""),
    module: moduleName,
    ends: date(d.ends_at),
    days: Number(d.days ?? 0),
  };
  const key = (NOTIFICATION_KINDS as readonly string[]).includes(n.kind) ? n.kind : "other";
  return { title: t(`kinds.${key}.title`, args), body: t(`kinds.${key}.text`, args) };
}
