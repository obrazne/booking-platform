import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/core/format/format";
import type { Stay } from "@/core/guest/zone";
import { AccountCrumbs } from "./account-nav";

/** "Pobyty › 22. – 26. 12. 2026" (› "Check-in") above a stay of the account (v2.4, Z43). */
export async function stayCrumbs(stay: Stay, checkin = false) {
  const [t, tc, locale] = await Promise.all([
    getTranslations("guest.account"),
    getTranslations("modules.checkin.guest"),
    getLocale(),
  ]);
  const range = `${formatDate(stay.checkIn, locale, "short")} – ${formatDate(stay.checkOut, locale)}`;
  return (
    <AccountCrumbs
      items={[
        { label: t("staysCrumb"), href: "/ucet" },
        checkin ? { label: range, href: `/ucet/pobyt/${stay.id}` } : { label: range },
        ...(checkin ? [{ label: tc("kicker") }] : []),
      ]}
    />
  );
}
