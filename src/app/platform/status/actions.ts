"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPlatformAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

/** The platform admin records a test restore of a backup (Z52) — shown in Stav systému. */
export async function recordRestoreTest(note: string): Promise<{ ok: boolean }> {
  if (!(await isPlatformAdmin())) return { ok: false };
  const text = z.string().trim().min(1).max(2000).safeParse(note);
  if (!text.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_backups")
    .insert({ kind: "restore_test", ok: true, note: text.data });
  if (error) return { ok: false };
  revalidatePath("/platform/status");
  return { ok: true };
}
