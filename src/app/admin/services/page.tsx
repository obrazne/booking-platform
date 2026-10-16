import { notFound } from "next/navigation";
import { isModuleEnabled } from "@/core/modules/registry";
import { getActiveMembership } from "@/core/tenant/active";
import { getTenantInfo } from "@/core/tenant/info";
import { ServicesPage } from "@/modules/services/page";

/** Route of the services module; a switched-off module behaves as if the page did not exist. */
export default async function Page() {
  const active = await getActiveMembership();
  if (!active || !(await isModuleEnabled(active.tenantId, "services"))) notFound();
  return <ServicesPage tenant={await getTenantInfo(active.tenantId)} />;
}
