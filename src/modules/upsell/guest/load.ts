import "server-only";
import { cache } from "react";
import { photoUrl } from "@/core/booking/photo";
import { tr } from "@/core/i18n/localized";
import { nightsOf, todayIso } from "@/core/pricing/dates";
import type { PriceModel } from "@/core/pricing/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { counts, dayMode, orderCutoff, orderPrice, type DayMode, type OrderStatus } from "../rules";

export type GuestOrder = {
  id: string;
  serviceId: string | null;
  label: string;
  amountCents: number;
  serviceDate: string | null;
  paymentMethod: "stay_account" | "transfer" | "card";
  status: OrderStatus;
  declineReason: string | null;
  cutoffAt: string;
  paidAt: string | null;
};

export type GuestOffer = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceModel: PriceModel;
  mode: DayMode;
  /** Price of one selection: one day for "multi"/"single", the whole stay for "none". */
  unitCents: number;
  requiresConfirmation: boolean;
  stayAccount: boolean;
  cutoffHours: number;
  /** Days of the stay the guest may pick (nights), with whether ordering for that day is still open. */
  days: { date: string; open: boolean; taken: boolean }[];
  /** For "none": when ordering closes (before arrival). */
  cutoffAt: string;
  open: boolean;
};

/**
 * What the guest sees of upsell for one stay — through the account (RLS) or the access link (token verified in the
 * database). Null when the caller has no access. Services and settings are read through the server (guests cannot
 * read tenant settings), filtered to the reservation's client and property.
 */
export const loadGuestUpsell = cache(
  async (reservationId: string, locale: string, token?: string) => {
    const supabase = await createClient();
    const [{ data: orderRows, error }, { data: account }] = await Promise.all([
      supabase.rpc("reservation_orders_for", {
        p_reservation_id: reservationId,
        p_token: token,
      }),
      supabase
        .rpc("stay_account", { p_reservation_id: reservationId, p_token: token })
        .maybeSingle(),
    ]);
    if (error || !account) return null;

    const admin = createAdminClient();
    const { data: r } = await admin
      .from("reservations")
      .select(
        "id, tenant_id, property_id, number, status, currency, adults, children, total_cents, items:reservation_items(check_in, check_out), payments(variable_symbol, purpose, status)",
      )
      .eq("id", reservationId)
      .single();
    if (!r) return null;
    const [{ data: tenant }, { data: settings }, { data: services }] = await Promise.all([
      admin.from("tenants").select("name, timezone").eq("id", r.tenant_id).single(),
      admin
        .from("tenant_settings")
        .select("contact_name, iban, bic, account_holder")
        .eq("tenant_id", r.tenant_id)
        .maybeSingle(),
      admin
        .from("services")
        .select(
          "id, name, description, image_path, price_model, amount_cents, max_quantity, property_id, sort, upsell_cutoff_hours, upsell_requires_confirmation, upsell_stay_account",
        )
        .eq("tenant_id", r.tenant_id)
        .eq("active", true)
        .eq("upsell_enabled", true)
        .order("sort"),
    ]);
    const timeZone = tenant?.timezone ?? "Europe/Bratislava";
    const checkIn = r.items.map((i) => i.check_in).sort()[0] ?? "";
    const checkOut =
      r.items
        .map((i) => i.check_out)
        .sort()
        .at(-1) ?? "";
    const nights = nightsOf(checkIn, checkOut);
    const persons = r.adults + r.children;
    const now = Date.now();
    // Orders are possible from the confirmation until departure (place_order).
    const orderable =
      (r.status === "confirmed" || r.status === "in_progress") && todayIso(timeZone) <= checkOut;

    const orders: GuestOrder[] = (orderRows ?? []).map((o) => ({
      id: o.id,
      serviceId: o.service_id,
      label: o.label,
      amountCents: o.amount_cents,
      serviceDate: o.service_date,
      paymentMethod: o.payment_method as GuestOrder["paymentMethod"],
      status: o.status as OrderStatus,
      declineReason: o.decline_reason,
      cutoffAt: o.cutoff_at,
      paidAt: o.paid_at,
    }));

    const offers: GuestOffer[] = (services ?? [])
      .filter((s) => !s.property_id || s.property_id === r.property_id)
      .map((s) => {
        const model = s.price_model as PriceModel;
        const mode = dayMode(model, s.upsell_requires_confirmation);
        const service = {
          priceModel: model,
          amountCents: s.amount_cents,
          maxQuantity: s.max_quantity,
        };
        const unitCents = orderPrice(
          service,
          { nights: nights.length, persons },
          1,
          mode !== "none",
        ).amountCents;
        const mine = orders.filter((o) => o.serviceId === s.id && counts(o.status));
        const days = nights.map((date) => ({
          date,
          open: orderCutoff(date, s.upsell_cutoff_hours, timeZone).getTime() > now,
          taken: mine.some((o) => o.serviceDate === date),
        }));
        const cutoffAt = orderCutoff(checkIn, s.upsell_cutoff_hours, timeZone);
        const open =
          orderable &&
          (mode === "multi"
            ? days.some((d) => d.open && !d.taken)
            : mode === "single"
              ? mine.length === 0 && days.some((d) => d.open)
              : mine.length === 0 && cutoffAt.getTime() > now);
        return {
          id: s.id,
          name: tr(s.name, locale),
          description: tr(s.description, locale) || null,
          image: s.image_path ? photoUrl(s.image_path) : null,
          priceModel: model,
          mode,
          unitCents,
          requiresConfirmation: s.upsell_requires_confirmation,
          stayAccount: s.upsell_stay_account,
          cutoffHours: s.upsell_cutoff_hours,
          days,
          cutoffAt: cutoffAt.toISOString(),
          open,
        };
      })
      // A service with nothing to order and no order of the guest is not shown.
      .filter(
        (o) => o.open || orders.some((x) => x.serviceId === o.id && x.status !== "cancelled"),
      );

    const payment = r.payments.find((p) => p.purpose === "reservation");
    const reservationPaid =
      r.status === "confirmed" || r.status === "in_progress" || r.status === "completed";
    return {
      reservation: {
        id: r.id,
        number: r.number,
        status: r.status,
        currency: r.currency,
        totalCents: r.total_cents,
        nights: nights.length,
        paid: reservationPaid,
        // From the day of arrival: "Na zajtra si môžete objednať" (design v2.4).
        during: orderable && todayIso(timeZone) >= checkIn,
        variableSymbol: payment?.variable_symbol ?? r.number.replace(/\D/g, ""),
      },
      tenantName: tenant?.name ?? "",
      timeZone,
      ownerName: settings?.contact_name?.trim().split(/\s+/)[0] || null,
      bank: settings?.iban
        ? { iban: settings.iban, bic: settings.bic, holder: settings.account_holder }
        : null,
      limitCents: account.limit_cents,
      /** Services offered after the reservation for this property (also while it waits for payment). */
      available: (services ?? []).filter((s) => !s.property_id || s.property_id === r.property_id)
        .length,
      orderable,
      offers,
      orders,
    };
  },
);

export type GuestUpsell = NonNullable<Awaited<ReturnType<typeof loadGuestUpsell>>>;
