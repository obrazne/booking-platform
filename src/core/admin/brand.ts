/**
 * Name of the platform and the support e-mail — the one setting for the side menu, the logins and e-mails to staff.
 * The brand is decided in phase 5; until then a placeholder (vizuál administrácie v1). Overridable per environment.
 */
export const platformBrand = {
  name: process.env.NEXT_PUBLIC_PLATFORM_NAME || "Booking platforma",
  /** Shown on the login screen only when set (NEXT_PUBLIC_SUPPORT_EMAIL). */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
} as const;
