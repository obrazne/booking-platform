import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { formatDate } from "@/core/format/format";
import type { SlotProps } from "@/core/modules/types";
import { loadGuestCheckin } from "./load";

/** Where the check-in screen of a stay is: in the account, or behind the access link. */
export function checkinHref(reservationId: string, token?: string) {
  return token ? `/r/${token}/checkin` : `/ucet/pobyt/${reservationId}/checkin`;
}

/**
 * Check-in card in the guest's stay (Z39, slot guest.stay.top, design `UcetPobyt`): to do — "Vybavte to teraz.
 * Na mieste už len kľúče." with "Začať check-in →"; done — a light green card with the persons and arrival time.
 */
export async function GuestCheckinCard({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const c = await loadGuestCheckin(reservationId, accessToken);
  if (!c) return null;
  const done = c.status === "completed";
  if (c.window === "module_off" || c.window === "not_confirmed") return null;
  if (c.window === "closed" && !done) return null;
  const t = await getTranslations("modules.checkin.guest");
  const href = checkinHref(reservationId, accessToken);

  if (done) {
    return (
      <section
        aria-label={t("kicker")}
        className="border-line flex items-center gap-3.5 rounded-[10px] border bg-[#f6f9f7] px-[22px] py-[18px]"
      >
        <span className="bg-primary text-primary-foreground inline-flex size-[34px] shrink-0 items-center justify-center rounded-full">
          <Check className="size-4" strokeWidth={2.4} />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-ink text-base font-bold">{t("cardDone")}</span>
          <span className="text-sm text-[#5a6672]">
            {[
              t("persons", { count: c.persons.length }),
              c.arrival_time ? t("arrivalAround", { time: c.arrival_time }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        {c.editable && c.window === "ok" ? (
          <Link
            href={href}
            className="text-ink text-sm font-medium underline underline-offset-[3px]"
            aria-label={t("editAria")}
          >
            {t("edit")}
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="checkin-card"
      className="border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[10px] border px-6 py-[22px]"
    >
      <div className="grid max-w-[520px] gap-1.5">
        <span className="text-accent-2 text-xs font-medium tracking-[0.16em] uppercase">
          {t("kicker")}
        </span>
        <h2 id="checkin-card" className="text-ink text-[22px] font-extrabold tracking-tight">
          {t("cardTitle")} <span className="text-ink-soft">{t("cardTitle2")}</span>
        </h2>
        <p className="text-sm leading-relaxed text-[#5a6672]">
          {t("cardText")}
          {c.required_for_instructions ? ` ${t("cardUnlocks")}` : ""}
        </p>
      </div>
      {c.window === "ok" ? (
        <Link
          href={href}
          className="inline-flex min-h-12 items-center rounded-full bg-[#2b3036] px-[22px] text-[15px] font-bold text-white hover:bg-[#0c0e11]"
        >
          {c.status === "in_progress" ? t("continue") : t("start")} →
        </Link>
      ) : c.opens_on ? (
        <span className="text-sm text-[#5a6672]">
          {t("opensOn", { date: formatDate(c.opens_on, locale) })}
        </span>
      ) : null}
    </section>
  );
}
