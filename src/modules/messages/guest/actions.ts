"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const args = z.object({ reservationId: z.uuid(), token: z.string().max(200).optional() });

function refresh(reservationId: string, token?: string) {
  if (token) revalidatePath(`/r/${token}`, "layout");
  else revalidatePath(`/ucet/pobyt/${reservationId}`, "layout");
  revalidatePath("/ucet", "layout");
}

/** The guest writes to the owner (account or access link); limits and the 30-day window are in the database. */
export async function sendGuestMessage(
  reservationId: string,
  body: string,
  token?: string,
): Promise<{ ok: boolean; error?: string }> {
  const a = args.safeParse({ reservationId, token });
  const text = body.trim();
  if (!a.success || !text || text.length > 4000) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_reservation_id: reservationId,
    p_body: text,
    p_token: token,
  });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "error" };
  refresh(reservationId, token);
  return { ok: true };
}

/** Opening the conversation marks the owner's messages as read for the guest. */
export async function markGuestMessagesRead(reservationId: string, token?: string) {
  const a = args.safeParse({ reservationId, token });
  if (!a.success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read", { p_reservation_id: reservationId, p_token: token });
  revalidatePath("/ucet", "layout");
}
