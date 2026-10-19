import { getTranslations } from "next-intl/server";
import { ExpandableList } from "@/core/admin/expandable-list";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { loadTenants } from "@/core/admin/platform-data";
import { isPlatformAdmin } from "@/core/auth/session";
import { moduleCatalog } from "@/core/modules/catalog";
import { AssignModuleForm, ModuleSwitchForm } from "../forms";

type ModuleStatus = "trial" | "active" | "off";

/**
 * Control center — Moduly › Katalóg (v1.2): each module as an expandable row (description, dependencies, number of
 * clients, finished / in preparation); a finished one lists its clients with the switch and "Priradiť klientovi".
 */
export default async function PlatformModules() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tc, tn, list] = await Promise.all([
    getTranslations("platform"),
    getTranslations("platform.catalog"),
    getTranslations("platform.nav"),
    loadTenants(),
  ]);
  const catalog = moduleCatalog();
  const name = (key: string) => tc(`${key}.name` as Parameters<typeof tc>[0]);
  const pill = (ready: boolean) => (
    <span
      className={
        ready
          ? "bg-primary/12 text-primary rounded-full px-2 py-0.5 text-xs font-bold"
          : "rounded-full bg-[#eef0f3] px-2 py-0.5 text-xs font-bold text-[#3b4652]"
      }
    >
      {ready ? tc("ready") : tc("planned")}
    </span>
  );

  return (
    <div data-bleed>
      <PageHeader
        help="platformModules"
        breadcrumbs={[
          { label: tn("modules"), href: "/platform/modules" },
          { label: tn("catalog") },
        ]}
        title={tc("title")}
      />
      <PageBody className="grid gap-4">
        <ExpandableList
          rows={catalog.map((m) => {
            const users = list.flatMap((x) =>
              x.tenant_modules
                .filter((r) => r.module_key === m.key && r.status !== "off")
                .map((r) => ({ tenant: x, row: r })),
            );
            const without = list
              .filter((x) => !users.some((u) => u.tenant.id === x.id))
              .map((x) => ({ id: x.id, name: x.name }));
            return {
              id: m.key,
              title: name(m.key),
              meta: [
                m.ready ? tc("clients", { count: users.length }) : null,
                m.dependsOn.length
                  ? tc("dependsOn", { modules: m.dependsOn.map(name).join(", ") })
                  : null,
              ]
                .filter(Boolean)
                .join(" · "),
              status: pill(m.ready),
              content: (
                <div className="grid gap-3 text-sm">
                  <p className="text-muted-foreground">
                    {tc(`${m.key}.desc` as Parameters<typeof tc>[0])}
                  </p>
                  {m.ready ? (
                    <>
                      {users.length ? (
                        <div className="border-hair grid border-y">
                          {users.map(({ tenant, row }) => (
                            <ModuleSwitchForm
                              key={tenant.id}
                              tenantId={tenant.id}
                              moduleKey={m.key}
                              label={tenant.name}
                              status={row.status as ModuleStatus}
                              trialEndsAt={row.trial_ends_at}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{tc("noClients")}</p>
                      )}
                      <AssignModuleForm moduleKey={m.key} label={name(m.key)} tenants={without} />
                    </>
                  ) : (
                    <p className="text-muted-foreground">{t("detail.inPreparation")}</p>
                  )}
                </div>
              ),
            };
          })}
        />
      </PageBody>
    </div>
  );
}
