import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, Phone } from "lucide-react";
import { formatDate } from "@/core/format/format";
import { Conversation } from "./conversation";
import type { GuestMessages } from "./load";

/**
 * The conversation on its own screen (Z47, design `MobilSpravy`; also the target of the e-mail on a phone): "‹" back to
 * the stay, the owner and the dates, the phone; the conversation fills the screen, the field stays at the bottom.
 */
export async function MessagesScreen({
  data,
  reservationId,
  token,
  locale,
  backHref,
}: {
  data: GuestMessages;
  reservationId: string;
  token?: string;
  locale: string;
  backHref: string;
}) {
  const t = await getTranslations("modules.messages.guest");
  return (
    <main className="mx-auto grid h-[calc(100svh-4rem)] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-line flex items-center gap-3 border-b px-3 py-2.5">
        <Link
          href={backHref}
          aria-label={t("backToStay")}
          className="text-ink inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <h1 className="text-ink truncate text-base font-bold">{data.owner.name}</h1>
          <span className="text-xs text-[#5a6672]">
            {data.checkIn
              ? `${formatDate(data.checkIn, locale, "short")} – ${formatDate(data.checkOut, locale, "short")}`
              : ""}
          </span>
        </span>
        {data.owner.phone ? (
          <a
            href={`tel:${data.owner.phone.replace(/\s/g, "")}`}
            aria-label={t("call", { phone: data.owner.phone })}
            className="text-ink inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5"
          >
            <Phone className="size-5" />
          </a>
        ) : null}
      </div>
      <Conversation data={data} reservationId={reservationId} token={token} locale={locale} full />
    </main>
  );
}
