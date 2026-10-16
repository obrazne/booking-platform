import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataListToolbar, Pagination, SortHeader } from "@/core/admin/data-list";
import { parsePanel } from "@/core/admin/panel-param";
import { PanelLink, RecordPanel } from "@/core/admin/record-panel";
import { formatDate } from "@/core/format/format";
import { getActiveMembership } from "@/core/tenant/active";
import { queryTeam, ROLES, teamListParams } from "./query";

export default async function TeamPage({ searchParams }: PageProps<"/admin/team">) {
  const active = await getActiveMembership();
  if (!active) notFound();
  const [t, locale, sp] = await Promise.all([getTranslations("team"), getLocale(), searchParams]);
  const tc = await getTranslations("common");

  const params = teamListParams(sp);
  const { rows, total } = await queryTeam(active.tenantId, params);
  const panel = parsePanel(sp.panel);
  const selected = panel?.type === "member" ? rows.find((r) => r.id === panel.id) : undefined;

  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <DataListToolbar
        filters={[
          {
            param: "role",
            label: t("role"),
            options: ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) })),
          },
        ]}
        exportHref="/admin/team/export"
      />
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>
                <SortHeader column="role">{t("role")}</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader column="created_at">{t("memberSince")}</SortHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  {tc("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <PanelLink type="member" id={r.id} className="font-medium hover:underline">
                      {r.fullName ?? r.email}
                    </PanelLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`roles.${r.role}`)}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(r.createdAt.slice(0, 10), locale)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination page={params.page} pageSize={params.pageSize} total={total} />

      {panel ? (
        <RecordPanel title={selected ? (selected.fullName ?? selected.email) : tc("detail")}>
          {selected ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">{t("email")}</dt>
              <dd>{selected.email}</dd>
              <dt className="text-muted-foreground">{t("role")}</dt>
              <dd>{t(`roles.${selected.role}`)}</dd>
              <dt className="text-muted-foreground">{t("memberSince")}</dt>
              <dd>{formatDate(selected.createdAt.slice(0, 10), locale, "long")}</dd>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">{tc("noResults")}</p>
          )}
        </RecordPanel>
      ) : null}
    </div>
  );
}
