import { getTranslations } from "next-intl/server";
import { loadAudit, parseAuditParams } from "@/core/admin/audit-query";
import { isPlatformAdmin } from "@/core/auth/session";

const cell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Audit as CSV (control center v1.2): everything matching the filters, semicolons for Excel, UTF-8 with BOM. */
export async function GET(request: Request) {
  if (!(await isPlatformAdmin())) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const [t, result] = await Promise.all([
    getTranslations("platform.auditPage"),
    loadAudit({ ...parseAuditParams(sp), page: 1 }, "all"),
  ]);
  const lines = [
    t("csvHeader"),
    ...result.rows.map((r) =>
      [r.at, r.tenantName ?? t("noClient"), r.actor ?? t("system"), r.label].map(cell).join(";"),
    ),
  ];
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
