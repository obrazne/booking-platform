/**
 * Human text of an audit entry (vizuál administrácie v1.1, rule 9 — never `module.changed` on screen).
 * `t` is the translator of `adminV1.audit`; `moduleName` turns a module key into its title.
 */
type Translate = (key: string, values?: Record<string, string>) => string;

export function auditLabel(
  t: Translate,
  entry: { action: string; entity: string; entity_id: string | null; data: unknown },
  moduleName: (key: string) => string,
): string {
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const after = (data.after ?? data) as Record<string, unknown>;
  const status = typeof after?.status === "string" ? after.status : "";
  switch (entry.action) {
    case "tenant.created":
      return t("tenantCreated");
    case "tenant.status_changed":
      return t("tenantStatus", { status: t(`tenantStatuses.${status || "active"}`) });
    case "module.changed":
      return t("moduleChanged", {
        module: moduleName(entry.entity_id ?? ""),
        status: t(`moduleStatuses.${status || "off"}`),
      });
    case "membership.created":
      return t("membershipCreated");
    case "admin.entered":
      return t("adminEntered");
    case "tenant.exported":
      return t("tenantExported");
    case "auth.signed_in":
      return t("signedIn", {
        method: t(`methods.${data.method === "password" ? "password" : "link"}`),
      });
    default:
      return t("other");
  }
}
