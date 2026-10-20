import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import type { SlotProps } from "@/core/modules/types";
import { Conversation } from "./conversation";
import { loadGuestMessages, messagesHref } from "./load";

/**
 * "Správy" in the guest's stay (Z47, slot guest.stay.top, design `SpravyPobyt`): "Píšte priamo Jane." with the emergency
 * phone, then the conversation card. On phones a row opens the conversation on its own screen (`MobilSpravy`).
 */
export async function GuestMessagesSection({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const data = await loadGuestMessages(reservationId, locale, accessToken);
  if (!data) return null;
  const t = await getTranslations("modules.messages.guest");
  const last = data.messages.at(-1);
  const initials = data.owner.name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section id="spravy" aria-labelledby="spravy-title" className="grid scroll-mt-24 gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-accent-2 text-xs font-medium tracking-[0.16em] uppercase">
            {t("kicker")}
          </span>
          <h2
            id="spravy-title"
            className="text-ink text-[26px] leading-tight font-extrabold tracking-tight"
          >
            {t("title", { name: data.owner.first })}
          </h2>
        </div>
        {data.owner.phone ? (
          <a href={`tel:${data.owner.phone.replace(/\s/g, "")}`} className="text-sm text-[#5a6672]">
            {t("emergency")} <span className="text-ink font-medium">{data.owner.phone}</span>
          </a>
        ) : null}
      </div>

      {/* Phones: one row to the conversation on its own screen. */}
      <Link
        href={messagesHref(reservationId, accessToken)}
        className="guest-card flex items-center gap-3 rounded-xl px-4 py-3.5 sm:hidden"
      >
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e9e5db] text-[13px] font-bold text-[#5a6672]"
        >
          {initials}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-ink text-[15px] font-bold">
            {data.owner.name}
            {data.unread ? (
              <span className="bg-accent-2 ml-2 inline-flex rounded-full px-2 py-px align-middle text-[11px] font-bold text-white">
                {t("newCount", { count: data.unread })}
              </span>
            ) : null}
          </span>
          <span className="truncate text-sm text-[#5a6672]">{last ? last.body : t("start")}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-[#5a6672]" />
      </Link>

      <div className="guest-card hidden overflow-hidden rounded-xl sm:block">
        <div className="border-line flex items-center gap-3 border-b px-5 py-3.5">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e9e5db] text-[13px] font-bold text-[#5a6672]"
          >
            {initials}
          </span>
          <span className="grid flex-1 gap-0.5">
            <span className="text-ink text-[15px] font-bold">{data.owner.name}</span>
            <span className="text-xs text-[#5a6672]">{t("about")}</span>
          </span>
          <span className="text-xs text-[#5a6672]">{t("alsoEmail")}</span>
        </div>
        <Conversation
          data={data}
          reservationId={reservationId}
          token={accessToken}
          locale={locale}
        />
      </div>
    </section>
  );
}

/** "Nová správa od Jany ↓" in the stay's header (Z47). */
export async function GuestMessagesPill({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const data = await loadGuestMessages(reservationId, locale, accessToken);
  if (!data?.unread) return null;
  const t = await getTranslations("modules.messages.guest");
  return (
    <a
      href="#spravy"
      className="bg-accent-2 inline-flex min-h-9 items-center justify-self-start rounded-full px-4 text-sm font-medium text-white"
    >
      {t("newFrom", { name: data.owner.first })} <span aria-hidden>&nbsp;↓</span>
    </a>
  );
}

/**
 * "Napísať správu" in the foot of the green stay card (Z70, slot guest.stay.contact): on a wide screen a jump to the
 * conversation on the page, on a phone its own page. The owner's name and phone are in the foot itself.
 */
export async function GuestMessagesWrite({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const data = await loadGuestMessages(reservationId, locale, accessToken);
  if (!data) return null;
  const t = await getTranslations("modules.messages.guest");
  // The button of a coloured surface (works with every client theme).
  const pill = "btn-on-accent min-h-9 items-center justify-center px-3.5 text-sm";
  return (
    <>
      <a href="#spravy" className={`hidden lg:inline-flex ${pill}`}>
        {t("write")}
      </a>
      <Link
        href={messagesHref(reservationId, accessToken)}
        className={`inline-flex lg:hidden ${pill}`}
      >
        {t("write")}
      </Link>
    </>
  );
}
