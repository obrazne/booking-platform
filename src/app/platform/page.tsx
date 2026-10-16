import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isPlatformAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

type TenantStatus = "onboarding" | "active" | "suspended";

export default async function PlatformTenants() {
  if (!(await isPlatformAdmin())) return null;
  const t = await getTranslations("platform");
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, status, tenant_domains(hostname, is_primary), tenant_modules(status)")
    .order("name");

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("tenants")}</h1>
        <Button asChild>
          <Link href="/platform/new">
            <Plus /> {t("newTenant")}
          </Link>
        </Button>
      </div>
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("domain")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("modules")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tenants ?? []).map((tenant) => {
              const primary =
                tenant.tenant_domains.find((d) => d.is_primary) ?? tenant.tenant_domains[0];
              const onCount = tenant.tenant_modules.filter((m) => m.status !== "off").length;
              return (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{primary?.hostname}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                      {t(`statuses.${tenant.status as TenantStatus}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{onCount}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
