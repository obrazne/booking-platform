"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { flushEmails } from "@/core/booking/notify";
import { createClient } from "@/lib/supabase/server";
import { requireGuest } from "./zone";

/**
 * Guest asks to cancel a stay from its detail (Z44): the same request as before (`guest_request_cancellation` —
 * only before the stay, the owner decides and is told by e-mail and in the bell). Through the access link (Z49) the
 * code decides instead of the account (`request_cancellation`).
 */
export async function requestCancellation(
  reservationId: string,
  note: string,
  token?: string,
): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(reservationId).success) return { ok: false };
  if (token) {
    if (!/^[0-9a-f]{48}$/.test(token)) return { ok: false };
    const supabase = await createClient();
    const { data } = await supabase.rpc("request_cancellation", {
      p_token: token,
      p_note: note.slice(0, 2000),
    });
    if (data === true) await flushEmails();
    revalidatePath(`/r/${token}`);
    return { ok: data === true };
  }
  const { supabase } = await requireGuest();
  const { data, error } = await supabase.rpc("guest_request_cancellation", {
    p_reservation_id: reservationId,
    p_note: note.slice(0, 2000),
  });
  revalidatePath(`/ucet/pobyt/${reservationId}`);
  return { ok: !error && Boolean(data) };
}
