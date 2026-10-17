"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuest } from "@/core/guest/zone";
import { PARTIAL_RATINGS } from "../model";

const input = z.object({
  reservationId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  parts: z.partialRecord(z.enum(PARTIAL_RATINGS), z.number().int().min(1).max(5)),
  body: z.string().max(4000),
  displayName: z.string().trim().min(1).max(60),
});

/** The guest submits the review of their stay; who may review is decided by the database (`submit_review`). */
export async function submitGuestReview(
  raw: z.input<typeof input>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;
  const { supabase } = await requireGuest();
  const { error } = await supabase.rpc("submit_review", {
    p_reservation_id: v.reservationId,
    p_rating: v.rating,
    p_ratings: v.parts,
    p_body: v.body.trim(),
    p_display_name: v.displayName,
  });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "error" };
  revalidatePath(`/ucet/pobyt/${v.reservationId}`);
  return { ok: true };
}
