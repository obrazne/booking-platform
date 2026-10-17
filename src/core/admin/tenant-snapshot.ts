import "server-only";
import { cache } from "react";
import { loadOccupancy } from "@/core/admin/occupancy";
import { isTestAccount } from "@/core/admin/platform-data";
import { addDays, diffDays, todayIso } from "@/core/pricing/dates";
import { shiftMonths } from "@/core/stats/compute";
import { loadMonthlyStats } from "@/core/stats/load";
import { createClient } from "@/lib/supabase/server";

/** Calendars that only exist in the demo (no download) — never reported as a failing synchronisation (v1.2). */
export const isDemoCalendar = (url: string | null | undefined) =>
  Boolean(url && /^https?:\/\/[^/?#]*\.invalid(?:[/:?#]|$)/i.test(url));

/**
 * One client at a glance for the control center (v1.2): revenue this and last month (the same function as
 * Statistics), reservations in 30 days and the last one, occupancy of the next 90 days, health, modules, owner.
 * Counts only — never guest names or contacts.
 */
export const tenantSnapshot = cache(async (tenantId: string) => {
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, timezone, currency, tenant_modules(module_key, status, trial_ends_at), memberships(user_id, role, profile:profiles(email, full_name)), tenant_settings(contact_phone)",
    )
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return null;
  const today = todayIso(tenant.timezone);
  const month = `${today.slice(0, 7)}-01`;
  const horizon = addDays(today, 90);
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const owner = tenant.memberships.find(
    (m) => m.role === "owner" && !isTestAccount(m.profile?.email),
  );

  const [
    months,
    { count: res30 },
    { data: last },
    events,
    { count: units },
    { data: channels },
    { count: failed },
    { data: signIn },
  ] = await Promise.all([
    loadMonthlyStats(tenantId, shiftMonths(month, -1), month),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", since30),
    supabase
      .from("reservations")
      .select("number, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadOccupancy(tenantId, today, horizon),
    supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("active", true),
    supabase
      .from("ical_channels")
      .select("name, import_url, active, last_status, last_error, last_sync_at")
      .eq("tenant_id", tenantId),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "failed"),
    owner
      ? supabase
          .from("audit_log")
          .select("created_at")
          .eq("actor_id", owner.user_id)
          .eq("action", "auth.signed_in")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const busy = events
    .filter((e) => e.kind !== "block")
    .reduce(
      (s, e) =>
        s +
        diffDays(
          e.checkIn < today ? today : e.checkIn,
          e.checkOut > horizon ? horizon : e.checkOut,
        ),
      0,
    );
  const available = 90 * Math.max(units ?? 0, 0);
  const calendars = (channels ?? []).map((c) => ({
    name: c.name,
    demo: isDemoCalendar(c.import_url),
    failing:
      c.active &&
      (c.last_status === "error" || c.last_status === "conflict") &&
      !isDemoCalendar(c.import_url),
    status: c.last_status,
    error: c.last_error,
    syncedAt: c.last_sync_at,
  }));

  return {
    id: tenant.id,
    name: tenant.name,
    currency: tenant.currency,
    revenueThisMonth: months.find((m) => m.month === month)?.revenueCents ?? 0,
    revenueLastMonth: months.find((m) => m.month === shiftMonths(month, -1))?.revenueCents ?? 0,
    reservations30: res30 ?? 0,
    lastReservation: last ? { number: last.number, at: last.created_at } : null,
    occupancy90: available ? Math.round((busy / available) * 100) : null,
    calendars,
    failingCalendars: calendars.filter((c) => c.failing).length,
    failedEmails: failed ?? 0,
    modules: tenant.tenant_modules
      .filter((m) => m.status !== "off")
      .map((m) => ({ key: m.module_key, status: m.status, trialEndsAt: m.trial_ends_at })),
    owner: owner
      ? {
          name: owner.profile?.full_name ?? null,
          email: owner.profile?.email ?? null,
          phone: tenant.tenant_settings?.contact_phone ?? null,
          lastSignIn: signIn?.created_at ?? null,
        }
      : null,
  };
});

export type TenantSnapshot = NonNullable<Awaited<ReturnType<typeof tenantSnapshot>>>;
