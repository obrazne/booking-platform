import { getTranslations } from "next-intl/server";
import { isModuleEnabled } from "@/core/modules/registry";
import { getActiveMembership } from "@/core/tenant/active";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

/** Monthly tax for accommodation for the municipality (Z36): stays arriving in the month, paying persons, amount. */
export async function GET(request: Request) {
  const active = await getActiveMembership();
  if (!active || !(await isModuleEnabled(active.tenantId, "checkin"))) {
    return new Response(null, { status: 403 });
  }
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response(null, { status: 400 });
  const [t, ts] = await Promise.all([
    getTranslations("modules.checkin.csv"),
    getTranslations("modules.checkin.csvSource"),
  ]);
  const supabase = await createClient();
  const [{ data: rows, error }, { data: settings }] = await Promise.all([
    supabase.rpc("city_tax_month", { p_tenant_id: active.tenantId, p_month: `${month}-01` }),
    supabase
      .from("tenant_settings")
      .select("city_tax_cents")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
  ]);
  if (error) return new Response(null, { status: 403 });
  const rate = settings?.city_tax_cents ?? 0;
  const csv = toCsv(
    [
      t("number"),
      t("guest"),
      t("checkIn"),
      t("checkOut"),
      t("nights"),
      t("paying"),
      t("exempt"),
      t("amount"),
      t("source"),
    ],
    (rows ?? []).map((r) => [
      r.number,
      r.guest_name,
      r.check_in,
      r.check_out,
      String(r.nights),
      String(r.paying),
      String(r.exempt),
      ((r.paying * r.nights * rate) / 100).toFixed(2),
      ts(r.source as "checkin"),
    ]),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dan-za-ubytovanie-${month}.csv"`,
    },
  });
}
