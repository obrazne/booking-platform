import "server-only";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { todayIso } from "@/core/pricing/dates";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { currentStay } from "./current-stay";
import type { AccountNavItem } from "./account-nav-items";
import { accountBadge } from "./todos";
import { listStays } from "./zone";

/**
 * Items of the guest account's navigation (Z59) — ONE source for the tabs of the account and the "Môj účet" menu in
 * the header: Aktuálny pobyt (going on, else the nearest coming; not without one) · Pobyty · Moje údaje.
 * Null for a visitor who is not signed in at this client.
 */
export const loadAccountNav = cache(async (): Promise<AccountNavItem[] | null> => {
  const tenant = await getTenantFromHost();
  if (!tenant) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return null;
  const { data: guestId } = await supabase.rpc("current_guest_id", { p_tenant_id: tenant.id });
  if (!guestId) return null;
  const [t, stays] = await Promise.all([getTranslations("guest.account"), listStays()]);
  const current = currentStay(stays, todayIso());
  const badge = await accountBadge(stays);
  return [
    ...(current
      ? [
          {
            key: "current" as const,
            href: `/ucet/pobyt/${current.id}`,
            label: t("tabs.current"),
            badge: 0,
          },
        ]
      : []),
    { key: "stays", href: "/ucet", label: t("tabs.stays"), badge },
    { key: "profile", href: "/ucet/udaje", label: t("tabs.profile"), badge: 0 },
  ];
});
