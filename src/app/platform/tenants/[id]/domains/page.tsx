import { getTranslations } from "next-intl/server";
import { loadTenantDetail, TenantHeader } from "../tenant-header";

/** Client detail — Domény: the public address first; development `*.localhost` marked "len vývoj" (v1.2). */
export default async function TenantDomains({
  params,
}: PageProps<"/platform/tenants/[id]/domains">) {
  const { id } = await params;
  const tenant = await loadTenantDetail(id);
  const t = await getTranslations("platform.detail");
  const dev = (h: string) => h.endsWith(".localhost");
  const domains = [...tenant.tenant_domains].sort(
    (a, b) =>
      Number(dev(a.hostname)) - Number(dev(b.hostname)) ||
      Number(b.is_primary) - Number(a.is_primary),
  );
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="domains" />
      <div className="grid max-w-[880px] gap-4 px-5 pt-6 pb-14 md:px-10">
        <ul className="surface overflow-hidden">
          {domains.map((d) => (
            <li
              key={d.hostname}
              className="border-hair flex flex-wrap items-center gap-3 border-b px-5 py-3.5 last:border-b-0"
            >
              {dev(d.hostname) ? (
                <span className="text-muted-foreground font-mono text-sm">{d.hostname}</span>
              ) : (
                <a
                  href={`https://${d.hostname}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink font-mono text-sm font-medium hover:underline"
                >
                  {d.hostname} ↗
                </a>
              )}
              {d.is_primary && !dev(d.hostname) ? (
                <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                  {t("primaryDomain")}
                </span>
              ) : null}
              {dev(d.hostname) ? (
                <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-xs font-bold text-[#3b4652]">
                  {t("devOnly")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-[13px]">{t("domainsNote")}</p>
      </div>
    </div>
  );
}
