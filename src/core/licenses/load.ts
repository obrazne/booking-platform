import "server-only";
import { createClient } from "@/lib/supabase/server";
import { licenseMonthBasis, type LicensePackage, type Turnover } from "./basis";

/** The licence of a client as its team or the platform admin sees it (RLS); null when none is recorded. */
export async function loadLicense(tenantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_licenses")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data;
}

/** The basis of Martin's invoice for one month (platform admin): the turnover by A10 and the lines. */
export async function loadLicenseBasis(tenantId: string, month: string) {
  const license = await loadLicense(tenantId);
  if (!license) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tenant_license_turnover", {
    p_tenant_id: tenantId,
    p_month: month,
  });
  if (error) throw new Error(error.message);
  const turnover = data as unknown as Turnover;
  return {
    license,
    turnover,
    ...licenseMonthBasis({ ...license, package: license.package as LicensePackage }, turnover),
  };
}
