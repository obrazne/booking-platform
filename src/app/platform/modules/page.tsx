import { getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { PageHeader } from "@/core/admin/page-header";
import { loadTenants } from "@/core/admin/platform-data";
import { isPlatformAdmin } from "@/core/auth/session";
import { listModules } from "@/core/modules/registry";

/** Control center — Moduly: each module with the clients that have it on or on trial (A3). */
export default async function PlatformModules() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tm, tAll, list] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.platform"),
    getTranslations(),
    loadTenants(),
  ]);
  return (
    <div data-bleed>
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={t("modules")}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        {listModules().map((m) => {
          const rows = list.flatMap((x) =>
            x.tenant_modules
              .filter((r) => r.module_key === m.key && r.status !== "off")
              .map((r) => ({ tenant: x.name, ...r })),
          );
          return (
            <section key={m.key} className="surface grid gap-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-ink text-lg font-extrabold">
                  {tAll(`${m.messages}.title` as Parameters<typeof tAll>[0])}
                </h2>
                <span className="text-muted-foreground text-sm">
                  {tm("moduleCounts", {
                    active: rows.filter((r) => r.status === "active").length,
                    trial: rows.filter((r) => r.status === "trial").length,
                  })}
                </span>
              </div>
              {rows.length ? (
                <ul className="border-hair border-t text-sm">
                  {rows.map((r) => (
                    <li
                      key={r.tenant}
                      className="border-hair flex justify-between gap-3 border-b py-2.5"
                    >
                      <span className="text-ink">{r.tenant}</span>
                      <span className="text-muted-foreground">
                        {t(`moduleStatus.${r.status as "trial"}`)}
                        {r.status === "trial" && r.trial_ends_at
                          ? ` · ${tm("until", { date: r.trial_ends_at.slice(0, 10) })}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">{tm("noClientsWithModule")}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
