"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyCancellationRequested } from "./notify";

/** Guest asks for cancellation through the access link; the owner decides (B5). */
export async function requestCancellation(token: string, _prev: { done: boolean }, form: FormData) {
  const note = String(form.get("note") ?? "").slice(0, 2000);
  const supabase = await createClient();
  const { data } = await supabase.rpc("request_cancellation", { p_token: token, p_note: note });
  if (data === true) {
    await notifyCancellationRequested(token).catch(() => undefined);
    revalidatePath(`/r/${token}`);
  }
  return { done: data === true };
}
