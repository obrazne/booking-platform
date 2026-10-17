import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/core/format/format";
import type { GuestTodo } from "@/core/modules/types";
import { loadGuestCheckin } from "./load";

/** Check-in on the guest's stay card (Z43): to do while open, when it opens before that. */
export async function checkinTodos({
  reservationId,
  locale,
}: {
  reservationId: string;
  locale: string;
}): Promise<GuestTodo[]> {
  const c = await loadGuestCheckin(reservationId);
  if (!c || c.status === "completed") return [];
  const t = await getTranslations("modules.checkin.guest");
  if (c.window === "ok") return [{ key: "checkin", tone: "warn", text: t("todo") }];
  if (c.window === "not_open" && c.opens_on)
    return [
      {
        key: "checkin",
        tone: "info",
        text: t("todoOpens", { date: formatDate(c.opens_on, locale, "short") }),
      },
    ];
  return [];
}
