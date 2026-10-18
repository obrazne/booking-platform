import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/core/format/format";
import { currentStay, nextStayAfter } from "@/core/guest/current-stay";
import type { Stay } from "@/core/guest/zone";
import { todayIso } from "@/core/pricing/dates";
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

/**
 * Above the heading of a stay in the account (Z59): a stay that is not the current one has a clear "← Všetky pobyty"
 * (its tab Pobyty is lit); a coming stay with another one after it has "Ďalší pobyt: 12. 2. 2027 ›".
 */
export async function stayTop(stay: Stay, stays: Stay[]) {
  const [t, locale] = await Promise.all([getTranslations("guest.account"), getLocale()]);
  const today = todayIso();
  const isCurrent = currentStay(stays, today)?.id === stay.id;
  const next = nextStayAfter(stays, stay.id, today);
  // Nothing above the current stay without another one after it (a fragment, not the default back link).
  if (isCurrent && !next) return <></>;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {isCurrent ? null : (
        <Link
          href="/ucet"
          className="text-ink inline-flex min-h-10 items-center gap-1.5 text-[15px] font-bold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" /> {t("allStays")}
        </Link>
      )}
      {next ? (
        <Link
          href={`/ucet/pobyt/${next.id}`}
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#3b4652] underline-offset-4 hover:underline"
        >
          {t("nextStay", { date: formatDate(next.checkIn, locale) })}{" "}
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
