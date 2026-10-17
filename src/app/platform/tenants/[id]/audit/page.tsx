import { parseAuditParams } from "@/core/admin/audit-query";
import { AuditView } from "../../../audit/audit-view";
import { loadTenantDetail, TenantHeader } from "../tenant-header";

/** Client detail — Záznam zmien: the audit of this client with the same filters as the control center. */
export default async function TenantAudit({
  params,
  searchParams,
}: PageProps<"/platform/tenants/[id]/audit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tenant = await loadTenantDetail(id);
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="audit" />
      <div className="grid max-w-[1180px] gap-4 px-5 pt-6 pb-14 md:px-10">
        <AuditView
          params={parseAuditParams(sp)}
          basePath={`/platform/tenants/${tenant.id}/audit`}
          tenantId={tenant.id}
        />
      </div>
    </div>
  );
}
