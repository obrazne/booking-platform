import { getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { parseAuditParams } from "@/core/admin/audit-query";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { isPlatformAdmin } from "@/core/auth/session";
import { AuditView } from "./audit-view";

/** Control center — Audit (v1.2): who changed what and when across clients, with filters and CSV. */
export default async function PlatformAudit({ searchParams }: PageProps<"/platform/audit">) {
  if (!(await isPlatformAdmin())) return null;
  const [t, tp, sp] = await Promise.all([
    getTranslations("platform"),
    getTranslations("platform.auditPage"),
    searchParams,
  ]);
  return (
    <div data-bleed>
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={tp("title")}
      />
      <PageBody className="grid max-w-[1180px] gap-4">
        <p className="text-muted-foreground max-w-prose text-sm">{tp("intro")}</p>
        <AuditView params={parseAuditParams(sp)} basePath="/platform/audit" />
      </PageBody>
    </div>
  );
}
