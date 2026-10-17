import "server-only";
import { getTranslations } from "next-intl/server";
import type { GuestTodo } from "@/core/modules/types";
import { loadGuestMessages } from "./load";

/** "Nová správa od Jany" on the stay card and in the badge of the account (Z47). */
export async function messageTodos({
  reservationId,
  locale,
}: {
  reservationId: string;
  locale: string;
}): Promise<GuestTodo[]> {
  const data = await loadGuestMessages(reservationId, locale);
  if (!data?.unread) return [];
  const t = await getTranslations("modules.messages.guest");
  return [{ key: "message", tone: "warn", text: t("newFrom", { name: data.owner.first }) }];
}
