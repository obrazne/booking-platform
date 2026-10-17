"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuest } from "./zone";

/**
 * Guest asks to cancel a stay from its detail (Z44): the same request as before (`guest_request_cancellation` —
 * only before the stay, the owner decides and is told by e-mail and in the bell).
 */
export async function requestCancellation(
  reservationId: string,
  note: string,
): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(reservationId).success) return { ok: false };
  const { supabase } = await requireGuest();
  const { data, error } = await supabase.rpc("guest_request_cancellation", {
    p_reservation_id: reservationId,
    p_note: note.slice(0, 2000),
  });
  revalidatePath(`/ucet/pobyt/${reservationId}`);
  return { ok: !error && Boolean(data) };
}
