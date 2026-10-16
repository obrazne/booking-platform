"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  body: z.string().trim().min(1).max(2000),
  author_name: z.string().trim().min(1).max(80),
  stay_month: z
    .union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("")])
    .transform((v) => (v ? `${v}-01` : null)),
  source: z.enum(["google", "booking", "airbnb", "email", "other"]),
  source_url: z.union([z.url().startsWith("https://"), z.literal("")]).transform((v) => v || null),
  property_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  sort: z.coerce.number().int().min(0).max(9999),
  featured: z.preprocess((v) => v === "on", z.boolean()),
  published: z.preprocess((v) => v === "on", z.boolean()),
});

/** Creates or updates a testimonial of the active tenant (B1, rozhodnutie 16. 10.). */
export async function saveTestimonial(_: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    featured: form.get("featured"),
    published: form.get("published"),
  });
  if (!parsed.success) return fail("invalid");
  const { id, body, ...rest } = parsed.data;
  const supabase = await createClient();
  const row = { ...rest, body: { sk: body }, tenant_id: active.tenantId };
  const { data, error } = id
    ? await supabase
        .from("testimonials")
        .update(row)
        .eq("id", id)
        .eq("tenant_id", active.tenantId)
        .select("id")
        .single()
    : await supabase.from("testimonials").insert(row).select("id").single();
  if (error)
    return fail(error.message.includes("featured") ? "tooManyFeatured" : dbErrorKey(error));
  revalidatePath("/admin/testimonials");
  if (!id) redirect(`/admin/testimonials?panel=testimonial:${data.id}`);
  return ok();
}

export async function deleteTestimonial(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const active = await requireTenant();
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id).eq("tenant_id", active.tenantId);
  revalidatePath("/admin/testimonials");
  redirect("/admin/testimonials");
}
