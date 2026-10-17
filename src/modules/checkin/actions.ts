"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";

export type Revealed = { documentNumber: string | null; birthDate: string | null } | null;

/** Owner reveals the document number and date of birth of a person; the database writes the view into the audit. */
export async function revealPerson(guestId: string): Promise<Revealed> {
  await requireTenant();
  if (!z.uuid().safeParse(guestId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("reveal_checkin_guest", { p_guest_id: guestId })
    .maybeSingle();
  if (error || !data) return null;
  return { documentNumber: data.document_number, birthDate: data.birth_date };
}

/** The owner marks a foreigner as reported to the police (or takes it back). */
export async function markReported(guestId: string, reported: boolean): Promise<ActionResult> {
  await requireTenant();
  if (!z.uuid().safeParse(guestId).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_foreigner_reported", {
    p_guest_id: guestId,
    p_reported: reported,
  });
  if (error) return fail(dbErrorKey(error));
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/arrivals");
  return ok();
}
