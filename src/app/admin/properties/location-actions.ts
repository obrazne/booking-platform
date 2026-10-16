"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

const coord = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .transform((v) => (v === "" ? null : v));

/** Position and how it is shown (exact pin and address / approximate area, B1 v2). */
export async function saveLocation(
  propertyId: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({
      location_mode: z.enum(["exact", "approximate"]),
      latitude: coord(-90, 90),
      longitude: coord(-180, 180),
    })
    .safeParse({
      location_mode: form.get("location_mode"),
      latitude: String(form.get("latitude") ?? "").replace(",", "."),
      longitude: String(form.get("longitude") ?? "").replace(",", "."),
    });
  if (!parsed.success || !z.uuid().safeParse(propertyId).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update(parsed.data)
    .eq("id", propertyId)
    .eq("tenant_id", active.tenantId);
  if (error) return fail(dbErrorKey(error));
  revalidatePath(`/admin/properties/${propertyId}/location`);
  return ok();
}

export async function addPlace(
  propertyId: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      how: z.string().trim().max(120),
      distance: z.string().trim().max(40),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || !z.uuid().safeParse(propertyId).success) return fail("invalid");
  const supabase = await createClient();
  const { count } = await supabase
    .from("property_places")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  const { error } = await supabase.from("property_places").insert({
    tenant_id: active.tenantId,
    property_id: propertyId,
    name: { sk: parsed.data.name },
    how: parsed.data.how ? { sk: parsed.data.how } : {},
    distance: parsed.data.distance || null,
    sort: (count ?? 0) + 1,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath(`/admin/properties/${propertyId}/location`);
  return ok();
}

export async function deletePlace(propertyId: string, id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const active = await requireTenant();
  const supabase = await createClient();
  await supabase.from("property_places").delete().eq("id", id).eq("tenant_id", active.tenantId);
  revalidatePath(`/admin/properties/${propertyId}/location`);
}

/** Highlighted amenities for "What awaits you" (v2): which, in what order, with a one-line note. */
export async function saveHighlights(
  propertyId: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const active = await requireTenant();
  if (!z.uuid().safeParse(propertyId).success) return fail("invalid");
  const supabase = await createClient();
  const { data: terms } = await supabase
    .from("property_terms")
    .select("term_id")
    .eq("property_id", propertyId)
    .eq("tenant_id", active.tenantId);
  for (const { term_id } of terms ?? []) {
    const highlighted = form.get(`hl_${term_id}`) === "on";
    const note = String(form.get(`note_${term_id}`) ?? "")
      .trim()
      .slice(0, 80);
    const sort = Number(form.get(`sort_${term_id}`)) || 0;
    const { error } = await supabase
      .from("property_terms")
      .update({ highlighted, highlight_note: note ? { sk: note } : {}, highlight_sort: sort })
      .eq("property_id", propertyId)
      .eq("term_id", term_id);
    if (error) return fail(dbErrorKey(error));
  }
  revalidatePath(`/admin/properties/${propertyId}/page`);
  return ok();
}
