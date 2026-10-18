import { signOutGuest } from "@/core/guest/auth";
import { loadAccountNav } from "@/core/guest/account-nav";
import { requireGuest } from "@/core/guest/zone";
import { AccountTabs } from "./account-nav";

/**
 * Guest account (v2.4, Z43, Z59): the tabs bar on every page of the account (current stay, stays, check-in, my
 * details) for a signed-in guest; the login page has none.
 */
export default async function AccountLayout({ children }: LayoutProps<"/ucet">) {
  const items = await loadAccountNav();
  if (!items) return <>{children}</>;
  await requireGuest();
  return (
    <>
      <AccountTabs items={items} signOut={signOutGuest} />
      {children}
    </>
  );
}
