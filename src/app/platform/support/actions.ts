"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** The platform admin closes a request (RLS: only the platform admin may). */
export async function markSupportDone(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("support_requests")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/platform/support");
}
