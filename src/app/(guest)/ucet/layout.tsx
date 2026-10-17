import { signOutGuest } from "@/core/guest/auth";
import { accountBadge } from "@/core/guest/todos";
import { listStays, requireGuest } from "@/core/guest/zone";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { AccountTabs } from "./account-nav";

/**
 * Guest account (v2.4, Z43): the tabs bar on every page of the account (overview, stay, check-in, my details) for a
 * signed-in guest; the login page has none.
 */
export default async function AccountLayout({ children }: LayoutProps<"/ucet">) {
  const tenant = await getTenantFromHost();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: guestId } =
    tenant && claims?.claims?.sub
      ? await supabase.rpc("current_guest_id", { p_tenant_id: tenant.id })
      : { data: null };
  if (!guestId) return <>{children}</>;
  await requireGuest();
  const badge = await accountBadge(await listStays());
  return (
    <>
      <AccountTabs badge={badge} signOut={signOutGuest} />
      {children}
    </>
  );
}
