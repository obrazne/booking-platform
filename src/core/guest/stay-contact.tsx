import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The only contact of a stay (Z70, pripomienka 58): the foot of the green stay card — who answers, "Napísať správu" from
 * a module (slot `guest.stay.contact`, the core does not know the module), WhatsApp and the phone when set. Before, the
 * contact was there three times and a separate card slid under the sticky green card.
 */
export async function StayContactFoot({
  name,
  phone,
  whatsapp,
  waText,
  write,
  className,
}: {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  /** Prefilled WhatsApp text (the number of the reservation). */
  waText?: string;
  /** "Napísať správu" of a module — `<ModuleSlot name="guest.stay.contact" … />`. */
  write?: ReactNode;
  /** Negative margins that put the foot flush with the card's edges. */
  className?: string;
}) {
  const tg = await getTranslations("guest");
  const initials = name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const round =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25";
  return (
    <div
      className={cn(
        "bg-accent-deep flex flex-wrap items-center gap-x-3 gap-y-3 rounded-b-lg",
        className,
      )}
    >
      <span className="text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold">
        {initials}
      </span>
      {/* Name on its own row, the actions under it — the aside column is narrow (~360 px). */}
      <span className="grid min-w-0 basis-[calc(100%-52px)] leading-tight">
        <span className="text-on-accent-muted text-xs">{tg("v2.questions")}</span>
        <span className="truncate text-[15px] font-bold">{name}</span>
      </span>
      <span className="flex w-full items-center gap-2 [&>a:first-child]:flex-1">
        {write}
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}${waText ? `?text=${encodeURIComponent(waText)}` : ""}`}
            aria-label={tg("cart.whatsapp")}
            className={round}
          >
            <MessageCircle className="size-4" />
          </a>
        ) : null}
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            aria-label={tg("cart.call")}
            className={round}
          >
            <Phone className="size-4" />
          </a>
        ) : null}
      </span>
    </div>
  );
}
