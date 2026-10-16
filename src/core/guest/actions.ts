"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuest } from "./zone";

export type FormState = { ok: boolean; error: boolean };

export async function updateGuestContact(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(40),
      country: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^([A-Z]{2})?$/),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: true };
  const { supabase, guest } = await requireGuest();
  const { error } = await supabase
    .from("guests")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
    })
    .eq("id", guest.id);
  revalidatePath("/ucet");
  return { ok: !error, error: Boolean(error) };
}

/** One-click marketing consent; the database keeps the history (B10). */
export async function setGuestMarketing(granted: boolean) {
  const { supabase, tenant } = await requireGuest();
  await supabase.rpc("guest_set_marketing", { p_tenant_id: tenant.id, p_granted: granted });
  revalidatePath("/ucet");
}

export async function requestStayCancellation(
  reservationId: string,
  _: { done: boolean },
  form: FormData,
): Promise<{ done: boolean }> {
  const { supabase } = await requireGuest();
  const note = String(form.get("note") ?? "").slice(0, 2000);
  const { data } = await supabase.rpc("guest_request_cancellation", {
    p_reservation_id: reservationId,
    p_note: note,
  });
  revalidatePath(`/ucet/pobyt/${reservationId}`);
  return { done: Boolean(data) };
}
