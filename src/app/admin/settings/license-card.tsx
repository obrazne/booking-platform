import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/core/format/format";
import { loadLicense } from "@/core/licenses/load";
import { cn } from "@/lib/utils";

const STATE_PILL: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  overdue: "bg-[#f6ecdf] text-[#8a4a22]",
  suspended: "bg-[#fbeceb] text-[#a8432f]",
};

/** Nastavenia › Všeobecné (Z81): the client sees the number of the licence, the package and the validity. */
export async function LicenseCard({ tenantId }: { tenantId: string }) {
  const [license, t, tp, tc, locale] = await Promise.all([
    loadLicense(tenantId),
    getTranslations("adminV1.license.card"),
    getTranslations("platform.license"),
    getTranslations("platform.catalog"),
    getLocale(),
  ]);
  if (!license) return null;
  const date = (d: string) => formatDate(d, locale);
  const rows: [string, React.ReactNode][] = [
    [
      t("number"),
      <span key="number" className="font-mono">
        {license.number}
      </span>,
    ],
    [t("package"), tp(`packages.${license.package as "basic"}`)],
    ...(license.package === "basic" && license.modules.length
      ? [
          [
            t("modules"),
            license.modules.map((m) => tc(`${m}.name` as Parameters<typeof tc>[0])).join(", "),
          ] as [string, React.ReactNode],
        ]
      : []),
    [
      t("valid"),
      license.contract_until
        ? t("validRange", { from: date(license.starts_on), to: date(license.contract_until) })
        : t("validFrom", { from: date(license.starts_on) }),
    ],
    [
      t("state"),
      <span
        key="state"
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
          STATE_PILL[license.state],
        )}
      >
        {tp(`states.${license.state as "active"}`)}
      </span>,
    ],
  ];
  return (
    <Card data-testid="license-card">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="border-hair grid border-t text-sm">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="border-hair flex flex-wrap justify-between gap-3 border-b py-2.5"
            >
              <dt className="text-[#5a6672]">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
