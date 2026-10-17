/** Kinds a new device gets switched on (Z33): new reservation, conflict, failed sync, cancellation request. */
export const DEFAULT_PUSH_KINDS = [
  "reservation_new",
  "calendar_conflict",
  "sync_failed",
  "cancel_request",
  "message_new",
] as const;

export const DEFAULT_PLATFORM_PUSH_KINDS = [
  "client_sync_failed",
  "client_emails_failed",
  "client_trial_ending",
  "client_new",
] as const;

export type PushDevice = {
  id: string;
  userId: string;
  tenantId: string | null;
  endpoint: string;
  kinds: readonly string[];
};

export type PushNotice = {
  audience: "tenant" | "platform";
  tenantId: string | null;
  kind: string;
};

/**
 * Devices a notification goes to: the device's scope (client or platform) and chosen kinds match, a client device
 * needs the `push` module of the client and its owner still in the team, a platform device a platform admin. Whoever
 * caused the event (already marked as read) is skipped, as in the bell.
 */
export function selectRecipients(
  notice: PushNotice,
  devices: readonly PushDevice[],
  ctx: {
    moduleEnabled: boolean;
    members: ReadonlySet<string>;
    platformAdmins: ReadonlySet<string>;
    readBy: ReadonlySet<string>;
  },
): PushDevice[] {
  if (notice.audience === "tenant" && !ctx.moduleEnabled) return [];
  return devices.filter((d) => {
    if (!d.kinds.includes(notice.kind) || ctx.readBy.has(d.userId)) return false;
    if (notice.audience === "platform") {
      return d.tenantId === null && ctx.platformAdmins.has(d.userId);
    }
    return d.tenantId !== null && d.tenantId === notice.tenantId && ctx.members.has(d.userId);
  });
}

/** Endpoints of test devices (`*.test`, `*.invalid`) are never contacted — like e-mails of test data. */
export function isTestEndpoint(endpoint: string): boolean {
  try {
    return /\.(test|invalid)$/i.test(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}
