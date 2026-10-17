import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { tenantSnapshot } from "@/core/admin/tenant-snapshot";
import { TenantStatusForm } from "../../forms";
import { SnapshotView } from "../../snapshot-view";
import { loadTenantDetail, TenantHeader } from "./tenant-header";

type TenantStatus = "onboarding" | "active" | "suspended";

/** Client detail — Prehľad (control center v1.2): the same numbers as the expanded row, plus the client's status. */
export default async function TenantOverview({ params }: PageProps<"/platform/tenants/[id]">) {
  const { id } = await params;
  const tenant = await loadTenantDetail(id);
  const [t, s] = await Promise.all([getTranslations("platform"), tenantSnapshot(id)]);
  if (!s) notFound();
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="overview" />
      <div className="grid max-w-[1180px] gap-8 px-5 pt-6 pb-14 md:px-10">
        <div className="surface p-5 md:p-6">
          <SnapshotView s={s} domain={tenant.domain} />
        </div>
        <section className="grid max-w-md gap-3">
          <h2 className="text-ink text-lg font-extrabold">{t("status")}</h2>
          <TenantStatusForm tenantId={tenant.id} status={tenant.status as TenantStatus} />
        </section>
      </div>
    </div>
  );
}
