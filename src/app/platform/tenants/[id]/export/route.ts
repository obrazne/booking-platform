import { notFound } from "next/navigation";
import { z } from "zod";
import { isPlatformAdmin } from "@/core/auth/session";
import { buildTenantExport } from "@/core/export/tenant-export";
import { createZip } from "@/core/export/zip";
import { createClient } from "@/lib/supabase/server";

// A client's data as a ZIP (Z52, A8): only the platform admin; every export is recorded in the audit.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: RouteContext<"/platform/tenants/[id]/export">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success || !(await isPlatformAdmin())) notFound();
  const { entries, tenant, counts } = await buildTenantExport(id);
  const zip = createZip(entries);
  const supabase = await createClient();
  await supabase.rpc("write_audit", {
    p_tenant_id: id,
    p_action: "tenant.exported",
    p_entity: "tenant",
    p_entity_id: id,
    p_data: { bytes: zip.length, counts },
  });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="export-${tenant.slug}-${day}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
