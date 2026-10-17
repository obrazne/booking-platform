"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";
import { REJECT_REASONS } from "@/modules/reviews/model";

const id = z.uuid();

/** One change of a review by the team (RLS: staff of the client with the module on; columns limited by grants). */
async function change(
  reviewId: string,
  patch: {
    status?: "published" | "rejected";
    reject_reason?: string;
    owner_reply?: string | null;
    featured?: boolean;
  },
): Promise<ActionResult> {
  const active = await requireTenant();
  if (!id.safeParse(reviewId).success) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", reviewId)
    .eq("tenant_id", active.tenantId)
    .select("id");
  if (error) return fail(dbErrorKey(error));
  if (!data?.length) return fail("forbidden");
  revalidatePath("/admin/reviews");
  return ok();
}

/** "Zverejniť teraz" — before the automatic publication after 72 h (or again after a rejection). */
export async function publishReview(reviewId: string) {
  return change(reviewId, { status: "published" });
}

/** "Zamietnuť" with a reason from the fixed list; the guest gets an e-mail (database). */
export async function rejectReview(reviewId: string, reason: string) {
  const parsed = z.enum(REJECT_REASONS).safeParse(reason);
  if (!parsed.success) return fail("invalid");
  return change(reviewId, { status: "rejected", reject_reason: parsed.data });
}

/** Public reply of the owner; an empty text removes it. */
export async function replyToReview(reviewId: string, text: string) {
  const reply = text.trim().slice(0, 2000);
  return change(reviewId, { owner_reply: reply || null });
}

/** "Dať navrch" — featured reviews go first on the page. */
export async function featureReview(reviewId: string, featured: boolean) {
  return change(reviewId, { featured });
}
