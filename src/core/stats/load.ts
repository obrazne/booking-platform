import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MonthStat } from "./compute";

/**
 * Monthly statistics of a tenant from `tenant_monthly_stats` (one database function for Statistics, Overview and
 * the control center). Runs as the signed-in user, so row level security decides what is visible.
 */
export async function loadMonthlyStats(
  tenantId: string,
  from: string,
  to: string,
): Promise<MonthStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tenant_monthly_stats", {
    p_tenant_id: tenantId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    month: r.month,
    revenueCents: Number(r.revenue_cents),
    futureCents: Number(r.future_cents),
    nightsSold: r.nights_sold,
    reservations: r.reservations,
    occupiedNights: r.occupied_nights,
    availableNights: r.available_nights,
  }));
}
