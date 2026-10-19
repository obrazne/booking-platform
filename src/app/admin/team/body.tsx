import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
import { formatDate } from "@/core/format/format";
import { getActiveMembership } from "@/core/tenant/active";
import { queryTeam, teamListParams } from "./query";

/**
 * Team of the tenant as compact rows (vizuál administrácie v1.1, rule 7): name · e-mail · role. Since Z69 the tab
 * Nastavenia › Tím (`?tab=tim`).
 */
export async function TeamBody({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const active = await getActiveMembership();
  if (!active) notFound();
  const [t, tc, locale] = await Promise.all([
    getTranslations("team"),
    getTranslations("common"),
    getLocale(),
  ]);
  const { rows } = await queryTeam(active.tenantId, { ...teamListParams(sp), pageSize: 200 });

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href="/admin/team/export" download>
            <Download /> {tc("exportCsv")}
          </a>
        </Button>
      </div>
      <ExpandableList
        rows={rows.map((r) => ({
          id: r.id,
          title: r.fullName ?? r.email,
          meta: r.fullName ? r.email : null,
          status: <RowState on={r.role === "owner"}>{t(`roles.${r.role}`)}</RowState>,
          content: (
            <dl className="grid gap-x-6 gap-y-2 text-sm font-normal sm:grid-cols-[auto_1fr]">
              <dt className="label-mono">{t("email")}</dt>
              <dd className="break-all">{r.email}</dd>
              <dt className="label-mono">{t("role")}</dt>
              <dd>{t(`roles.${r.role}`)}</dd>
              <dt className="label-mono">{t("memberSince")}</dt>
              <dd>{formatDate(r.createdAt.slice(0, 10), locale, "long")}</dd>
            </dl>
          ),
        }))}
        empty={tc("noResults")}
      />
    </div>
  );
}
