"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

const input = z
  .object({
    propertyId: z.uuid().nullable(),
    reservationId: z.uuid().nullable(),
    storagePath: z.string().min(1).max(300),
    title: z.string().trim().min(1).max(120),
    visibleWhen: z.enum(["always", "confirmed"]),
  })
  .refine((v) => (v.propertyId === null) !== (v.reservationId === null));

/** Registers a file the owner uploaded to the private bucket (B10): per property or per reservation. */
export async function registerDocument(raw: z.input<typeof input>): Promise<ActionResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const active = await requireTenant();
  const v = parsed.data;
  if (!v.storagePath.startsWith(`${active.tenantId}/`)) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    tenant_id: active.tenantId,
    property_id: v.propertyId,
    reservation_id: v.reservationId,
    storage_path: v.storagePath,
    title: { sk: v.title },
    visible_when: v.visibleWhen,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin", "layout");
  return ok();
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("invalid");
  const active = await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", active.tenantId)
    .single();
  if (!data) return fail("notFound");
  // The file stays 30 days so the document can be restored from the trash (Z31); the job worker removes it later.
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin", "layout");
  return ok();
}
