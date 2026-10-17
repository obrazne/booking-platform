import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const view = z.object({
  window: z.enum(["ok", "module_off", "not_confirmed", "not_open", "closed"]),
  status: z.enum(["not_started", "in_progress", "completed"]),
  arrival_time: z.string().nullable(),
  house_rules_accepted: z.boolean(),
  completed_at: z.string().nullable(),
  editable: z.boolean(),
  opens_on: z.string().nullable(),
  required_for_instructions: z.boolean(),
  check_in_from: z.string().nullable(),
  expected: z.number(),
  country: z.string(),
  missing: z.array(z.string()),
  persons: z.array(
    z.object({
      id: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      is_citizen: z.boolean(),
      nationality: z.string().nullable(),
      document_type: z.string().nullable(),
      address: z.string().nullable(),
      document_masked: z.string().nullable(),
      has_birth_date: z.boolean(),
    }),
  ),
});

export type GuestCheckinView = z.infer<typeof view>;

/**
 * The guest's check-in of one stay (Z39) — through the account or the access link (the database verifies access
 * and masks the document number and date of birth). Null without access. With it what the screens need around:
 * the stay, the property, when the arrival instructions unlock, a link to the house rules.
 */
export const loadGuestCheckin = cache(async (reservationId: string, token?: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guest_checkin_view", {
    p_reservation_id: reservationId,
    p_token: token,
  });
  if (error || !data) return null;
  const parsed = view.safeParse(data);
  if (!parsed.success) return null;
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select(
      "id, tenant_id, number, guest_name, adults, children, infants, property:properties(name), items:reservation_items(check_in, check_out)",
    )
    .eq("id", reservationId)
    .single();
  if (!r) return null;
  const { data: settings } = await admin
    .from("tenant_settings")
    .select("arrival_email_days_before, terms_url, contact_name")
    .eq("tenant_id", r.tenant_id)
    .maybeSingle();
  const checkIn = r.items.map((i) => i.check_in).sort()[0] ?? "";
  const checkOut =
    r.items
      .map((i) => i.check_out)
      .sort()
      .at(-1) ?? "";
  const arrivalDays = settings?.arrival_email_days_before ?? 3;
  const unlock = new Date(`${checkIn}T00:00:00Z`);
  unlock.setUTCDate(unlock.getUTCDate() - arrivalDays);
  return {
    ...parsed.data,
    reservation: {
      id: r.id,
      tenantId: r.tenant_id,
      number: r.number,
      guestName: r.guest_name,
      checkIn,
      checkOut,
      persons: r.adults + r.children + r.infants,
      propertyName: r.property?.name ?? "",
    },
    arrivalDays,
    instructionsFrom: unlock.toISOString().slice(0, 10),
    houseRulesUrl: settings?.terms_url ?? null,
    ownerName: settings?.contact_name?.trim().split(/\s+/)[0] || null,
  };
});

export type GuestCheckin = NonNullable<Awaited<ReturnType<typeof loadGuestCheckin>>>;
