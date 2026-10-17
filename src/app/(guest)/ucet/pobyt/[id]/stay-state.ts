import { z } from "zod";

/** Which variant of the stay page applies (design v2.4 `StavyPobytu` + v2.3 `UcetPobyt`). */
export type StayPhase = "pending" | "before" | "during" | "after" | "cancelled";

/**
 * Phase of a stay from its state and dates: during = from the day of arrival to the day of departure (also when the
 * reservation is still "confirmed" — the state changes later in the day), after = finished or past departure.
 */
export function stayPhase(
  status: string,
  checkIn: string,
  checkOut: string,
  today: string,
): StayPhase {
  if (status === "cancelled") return "cancelled";
  if (status === "pending_payment") return "pending";
  if (status === "completed" || today > checkOut) return "after";
  if (status === "in_progress" || today >= checkIn) return "during";
  return "before";
}

const schema = z.object({
  arrival: z.object({
    visible: z.boolean(),
    from: z.string(),
    needs_payment: z.boolean(),
    needs_checkin: z.boolean(),
    check_in_from: z.string().nullable(),
    check_out_until: z.string().nullable(),
    instructions: z.unknown().nullable(),
    door_code: z.string().nullable(),
    wifi_name: z.string().nullable(),
    wifi_password: z.string().nullable(),
  }),
  cancelled_at: z.string().nullable(),
  cancelled_reason: z.string().nullable(),
  refunded_cents: z.number(),
});

/** What `guest_stay_state` returns, in the shape the page uses (null when it cannot be read). */
export function stayStateOf(data: unknown) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    arrival: {
      visible: d.arrival.visible,
      from: d.arrival.from,
      needsPayment: d.arrival.needs_payment,
      needsCheckin: d.arrival.needs_checkin,
      checkInFrom: d.arrival.check_in_from,
      checkOutUntil: d.arrival.check_out_until,
      instructions: d.arrival.instructions,
      doorCode: d.arrival.door_code,
      wifiName: d.arrival.wifi_name,
      wifiPassword: d.arrival.wifi_password,
    },
    cancelledAt: d.cancelled_at,
    cancelledReason: d.cancelled_reason,
    refundedCents: d.refunded_cents,
  };
}
