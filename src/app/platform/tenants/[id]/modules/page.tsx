import { getTranslations } from "next-intl/server";
import { moduleCatalog } from "@/core/modules/catalog";
import { ModuleSwitchForm } from "../../../forms";
import { loadTenantDetail, TenantHeader } from "../tenant-header";

type ModuleStatus = "trial" | "active" | "off";

/** Client detail — Moduly: switch each finished module for this client; modules in preparation only listed (v1.2). */
export default async function TenantModules({
  params,
}: PageProps<"/platform/tenants/[id]/modules">) {
  const { id } = await params;
  const tenant = await loadTenantDetail(id);
  const [t, tc] = await Promise.all([
    getTranslations("platform.detail"),
    getTranslations("platform.catalog"),
  ]);
  const catalog = moduleCatalog();
  const name = (key: string) => tc(`${key}.name` as Parameters<typeof tc>[0]);
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="modules" />
      <div className="grid max-w-[880px] gap-4 px-5 pt-6 pb-14 md:px-10">
        <p className="text-muted-foreground max-w-prose text-sm">{t("modulesIntro")}</p>
        {catalog
          .filter((m) => m.ready)
          .map((m) => {
            const row = tenant.tenant_modules.find((x) => x.module_key === m.key);
            return (
              <div key={m.key} className="grid gap-1.5">
                <ModuleSwitchForm
                  tenantId={tenant.id}
                  moduleKey={m.key}
                  label={name(m.key)}
                  status={(row?.status ?? "off") as ModuleStatus}
                  trialEndsAt={row?.trial_ends_at ?? null}
                />
                <p className="text-muted-foreground px-1 text-[13px]">
                  {tc(`${m.key}.desc` as Parameters<typeof tc>[0])}
                </p>
              </div>
            );
          })}
        <ul className="border-hair mt-2 border-t">
          {catalog
            .filter((m) => !m.ready)
            .map((m) => (
              <li
                key={m.key}
                className="border-hair flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-3 text-sm"
              >
                <span className="text-ink font-medium">{name(m.key)}</span>
                <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-xs font-bold text-[#3b4652]">
                  {tc("planned")}
                </span>
                <span className="text-muted-foreground w-full">
                  {tc(`${m.key}.desc` as Parameters<typeof tc>[0])}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
