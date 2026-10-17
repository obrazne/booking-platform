import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Everything an e-mail about a reservation needs, read with the service key (worker runs without a user). */
export async function loadEmailContext(reservationId: string) {
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select(
      `id, tenant_id, number, status, guest_name, guest_email, adults, children, infants, pets, locale, currency,
       total_cents, payment_due_at, cancellation_request_note,
       items:reservation_items(check_in, check_out, unit:units(name)),
       lines:reservation_lines(kind, label, quantity, unit_amount_cents, amount_cents, sort),
       payments(variable_symbol, amount_cents),
       property:properties(id, name, street, city, postal_code, check_in_from, check_out_until, contact_email, booking_mode,
         private:property_private(arrival_instructions)),
       tenant:tenants(name, timezone, default_locale, domains:tenant_domains(hostname, is_primary))`,
    )
    .eq("id", reservationId)
    .eq("payments.purpose", "reservation")
    .single();
  if (!r) return null;
  const [{ data: settings }, { data: theme }, { data: token }] = await Promise.all([
    admin.from("tenant_settings").select("*").eq("tenant_id", r.tenant_id).maybeSingle(),
    admin.from("tenant_themes").select("primary_color").eq("tenant_id", r.tenant_id).maybeSingle(),
    admin.rpc("reservation_access_token", { p_reservation_id: reservationId }),
  ]);
  const domains = r.tenant?.domains ?? [];
  const publicHost =
    domains.find((d) => d.is_primary && !d.hostname.endsWith(".localhost"))?.hostname ??
    domains.find((d) => !d.hostname.endsWith(".localhost"))?.hostname ??
    null;
  const guestBase = publicHost ? `https://${publicHost}` : (process.env.APP_URL ?? "");
  const appUrl = process.env.APP_URL ?? (publicHost ? `https://${publicHost}` : "");
  return {
    r,
    settings,
    accent: theme?.primary_color ?? "#2f5d50",
    guestLink: token ? `${guestBase}/r/${token}` : null,
    // The stay in the guest's account (sign-in by a code) — when there is no access link.
    stayLink: `${guestBase}/ucet/pobyt/${r.id}`,
    // Review of the stay in the guest's account (Z34; the page itself comes with the guest screens).
    reviewLink: `${guestBase}/ucet/pobyt/${r.id}/hodnotenie`,
    // Online check-in of the stay in the guest's account (Z36; the page comes with the guest screens, Z39).
    checkinLink: `${guestBase}/ucet/pobyt/${r.id}/checkin`,
    adminLink: `${appUrl}/admin/reservations?panel=reservation:${r.id}`,
  };
}

export type EmailContext = NonNullable<Awaited<ReturnType<typeof loadEmailContext>>>;
