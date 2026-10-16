import { getTranslations } from "next-intl/server";
import { getActiveMembership } from "@/core/tenant/active";
import { toCsv } from "@/lib/csv";
import { queryTeam, teamListParams } from "../query";

/** CSV of the team with the same filters as the list (no paging). */
export async function GET(request: Request) {
  const active = await getActiveMembership();
  if (!active) return new Response(null, { status: 403 });
  const t = await getTranslations("team");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { rows } = await queryTeam(active.tenantId, teamListParams(sp), false);
  const csv = toCsv(
    [t("name"), t("email"), t("role"), t("memberSince")],
    rows.map((r) => [r.fullName ?? "", r.email, t(`roles.${r.role}`), r.createdAt.slice(0, 10)]),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="team-${active.tenantSlug}.csv"`,
    },
  });
}
