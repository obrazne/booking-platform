import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { loadTenants } from "@/core/admin/platform-data";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDate } from "@/core/format/format";
import { diffDays, todayIso } from "@/core/pricing/dates";

/** Control center — Moduly › Skúšobné doby (v1.2): every trial across clients, the nearest end first. */
export default async function PlatformTrials() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tc, tn, locale, list] = await Promise.all([
    getTranslations("platform.trials"),
    getTranslations("platform.catalog"),
    getTranslations("platform.nav"),
    getLocale(),
    loadTenants(),
  ]);
  const today = todayIso();
  const trials = list
    .flatMap((x) =>
      x.tenant_modules
        .filter((m) => m.status === "trial" && m.trial_ends_at)
        .map((m) => ({ tenant: x, key: m.module_key, ends: m.trial_ends_at!.slice(0, 10) })),
    )
    .sort((a, b) => a.ends.localeCompare(b.ends));
  const name = (key: string) =>
    tc.has(`${key}.name` as never) ? tc(`${key}.name` as Parameters<typeof tc>[0]) : key;

  return (
    <div data-bleed>
      <PageHeader
        help="platformTrials"
        breadcrumbs={[{ label: tn("modules"), href: "/platform/modules" }, { label: tn("trials") }]}
        title={t("title")}
      />
      <PageBody className="grid gap-4">
        {trials.length ? (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="label-mono border-hair border-b text-left">
                  <th className="px-4 py-3 font-medium">{t("client")}</th>
                  <th className="px-4 py-3 font-medium">{t("module")}</th>
                  <th className="px-4 py-3 font-medium">{t("ends")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("left")}</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((r) => {
                  const left = diffDays(today, r.ends);
                  return (
                    <tr
                      key={`${r.tenant.id}-${r.key}`}
                      className="border-hair border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/platform/tenants/${r.tenant.id}/modules`}
                          className="text-ink font-medium hover:underline"
                        >
                          {r.tenant.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{name(r.key)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(r.ends, locale)}</td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${left <= 7 ? "font-bold text-[#8a4a22]" : ""}`}
                      >
                        {left < 0 ? t("ended") : t("daysLeft", { count: left })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("none")}</p>
        )}
      </PageBody>
    </div>
  );
}
