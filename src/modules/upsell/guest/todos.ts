import "server-only";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/core/format/format";
import type { GuestTodo } from "@/core/modules/types";
import { money } from "@/core/money/money";
import { counts } from "../rules";
import { loadGuestUpsell } from "./load";

/** Ordered services on the guest's stay card (Z43): what is ordered, waiting for confirmation, and how it is paid. */
export async function upsellTodos({
  reservationId,
  locale,
}: {
  reservationId: string;
  locale: string;
}): Promise<GuestTodo[]> {
  const u = await loadGuestUpsell(reservationId, locale);
  if (!u) return [];
  const t = await getTranslations("modules.upsell.guestTodo");
  return u.orders
    .filter((o) => counts(o.status))
    .map((o) => ({
      key: `order:${o.id}`,
      tone: "info" as const,
      text: t(o.status === "awaiting_confirmation" ? "awaiting" : "ordered", {
        service: o.label,
        amount: formatMoney(money(o.amountCents, u.reservation.currency), locale),
        method: t(`methods.${o.paymentMethod}`),
      }),
    }));
}
