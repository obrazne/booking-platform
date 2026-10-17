"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult =
  | { ok: true }
  | {
      ok: false;
      error: "incomplete" | "closed" | "not_allowed" | "invalid" | "generic";
      missing?: string[];
    };

const person = z.object({
  id: z.uuid().optional(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  is_citizen: z.boolean(),
  nationality: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .or(z.literal("")),
  birth_date: z.iso.date().optional().or(z.literal("")),
  document_type: z.enum(["id_card", "passport"]).optional().or(z.literal("")),
  document_number: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
});

const input = z.object({
  reservationId: z.uuid(),
  token: z.string().min(10).max(200).optional(),
  arrivalTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  houseRules: z.literal(true),
  guests: z.array(person).min(1).max(30),
});

/**
 * Guest finishes the check-in (Z39): saves the persons, arrival time and consent, then completes it — the database
 * checks the fields by the rules of the country (`save_checkin`, `complete_checkin`). Empty document number or date
 * of birth of a saved person keeps the saved one (the guest sees them masked).
 */
export async function finishCheckin(data: z.input<typeof input>): Promise<CheckinResult> {
  const parsed = input.safeParse(data);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { reservationId, token, arrivalTime, guests } = parsed.data;
  const supabase = await createClient();
  const saved = await supabase.rpc("save_checkin", {
    p_reservation_id: reservationId,
    p_token: token,
    p_data: { arrival_time: arrivalTime, house_rules_accepted: true, guests },
  });
  if (saved.error) return failure(saved.error);
  const done = await supabase.rpc("complete_checkin", {
    p_reservation_id: reservationId,
    p_token: token,
  });
  if (done.error) return failure(done.error);
  revalidatePath("/ucet/pobyt/[id]", "page");
  revalidatePath("/ucet/pobyt/[id]/checkin", "page");
  revalidatePath("/r/[token]", "page");
  revalidatePath("/r/[token]/checkin", "page");
  return { ok: true };
}

function failure(error: { message?: string; code?: string; details?: string }): CheckinResult {
  const m = error.message ?? "";
  if (m.includes("incomplete")) {
    let missing: string[] = [];
    try {
      missing = JSON.parse(error.details ?? "[]");
    } catch {}
    return { ok: false, error: "incomplete", missing };
  }
  if (error.code === "42501") return { ok: false, error: "not_allowed" };
  if (/not_open|closed|completed|not_confirmed|module_off/.test(m))
    return { ok: false, error: "closed" };
  if (error.code === "22023" || error.code === "23514" || error.code === "22P02")
    return { ok: false, error: "invalid" };
  return { ok: false, error: "generic" };
}
