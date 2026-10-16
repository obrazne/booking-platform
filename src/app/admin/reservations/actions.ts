"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getCurrentUser } from "@/core/auth/session";
import { getStaffCatalog } from "@/core/booking/staff-catalog";
import { tr } from "@/core/i18n/localized";
import { calculatePrice } from "@/core/pricing/calculate";
import { todayIso } from "@/core/pricing/dates";
import { getEnabledModules } from "@/core/modules/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { priceContributorsFor } from "@/modules/price-contributors";
import { toPricingInput } from "@/core/booking/pricing-input";

function refresh(id?: string) {
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/reservations?panel=reservation:${id}`);
}

export async function confirmPayment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_payment", { p_reservation_id: id });
  if (error) return fail(dbErrorKey(error));
  refresh(id);
  return ok();
}

export async function cancelReservation(
  id: string,
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const reason =
    String(form.get("reason") ?? "")
      .trim()
      .slice(0, 500) || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: id,
    p_reason: reason ?? undefined,
  });
  if (error) return fail(dbErrorKey(error));
  refresh(id);
  return ok();
}

export async function setProgress(
  id: string,
  status: "in_progress" | "completed",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_reservation_progress", {
    p_reservation_id: id,
    p_status: status,
  });
  if (error) return fail(dbErrorKey(error));
  refresh(id);
  return ok();
}

export async function declineCancellationRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_cancellation_request", { p_reservation_id: id });
  if (error) return fail(dbErrorKey(error));
  refresh(id);
  return ok();
}

export async function addNote(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const active = await requireTenant();
  const user = await getCurrentUser();
  const body = String(form.get("body") ?? "").trim();
  if (!body || !user) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("reservation_notes").insert({
    tenant_id: active.tenantId,
    reservation_id: id,
    author_id: user.id,
    body: body.slice(0, 4000),
  });
  if (error) return fail(dbErrorKey(error));
  refresh(id);
  return ok();
}

const manualSchema = z.object({
  unit_id: z.uuid(),
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50),
  pets: z.coerce.number().int().min(0).max(10),
  guest_name: z.string().trim().min(2).max(120),
  guest_email: z.email(),
  guest_phone: z.string().trim().max(40).default(""),
  guest_note: z.string().trim().max(2000).default(""),
  status: z.enum(["pending_payment", "confirmed"]),
  paid: z.preprocess((v) => v === "on", z.boolean()),
});

/**
 * Manual reservation by staff (e.g. a phone call, B5). Same price calculation and the same database function as
 * guest bookings; counted into turnover like a direct booking (ROZHODNUTIA 16. 10.).
 */
export async function createManualReservation(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const active = await requireTenant();
  const user = await getCurrentUser();
  if (!user || !["owner", "reception"].includes(active.role)) return fail("forbidden");
  const parsed = manualSchema.safeParse({ ...Object.fromEntries(form), paid: form.get("paid") });
  if (!parsed.success || parsed.data.check_out <= parsed.data.check_in) return fail("invalid");
  const v = parsed.data;

  const staff = await getStaffCatalog(active.tenantId, v.unit_id);
  if (!staff) return fail("invalid");
  const selectedServices: Record<string, number> = {};
  for (const [key, value] of form.entries()) {
    const n = Number(value);
    if (key.startsWith("service_") && Number.isInteger(n) && n > 0)
      selectedServices[key.slice(8)] = n;
  }
  const modules = (await getEnabledModules(active.tenantId)).map((m) => m.key);
  const price = calculatePrice(
    toPricingInput(staff.catalog, {
      checkIn: v.check_in,
      checkOut: v.check_out,
      adults: v.adults,
      children: v.children,
      pets: v.pets,
      selectedServices,
      selectedFees: {},
      promoCode: null,
      bookedOn: todayIso(),
    }),
    priceContributorsFor(modules),
  );
  if (!price.ok) return fail("invalid");
  const tg = await getTranslations("guest");

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("create_reservation", {
      p: {
        tenant_id: active.tenantId,
        property_id: staff.propertyId,
        unit_id: v.unit_id,
        check_in: v.check_in,
        check_out: v.check_out,
        status: v.status,
        paid: v.status === "confirmed" && v.paid,
        source: "manual",
        guest_name: v.guest_name,
        guest_email: v.guest_email,
        guest_phone: v.guest_phone,
        adults: v.adults,
        children: v.children,
        pets: v.pets,
        locale: staff.locale,
        currency: staff.catalog.currency,
        total_cents: price.totalCents,
        guest_note: v.guest_note,
        created_by: user.id,
        lines: price.lines.map((l) => ({
          kind: l.kind,
          ref_id: l.refId,
          label: l.labelKey === "touristTax" ? tg("touristTax") : tr(l.name, staff.locale),
          quantity: l.quantity,
          unit_amount_cents: l.unitAmountCents,
          amount_cents: l.amountCents,
          vat_bp: l.vatBp,
          meta: l.meta,
        })),
        consents: [],
      } as unknown as Json,
    })
    .single();
  if (error) return fail(dbErrorKey(error));
  refresh();
  redirect(`/admin/reservations?panel=reservation:${data.id}`);
}
