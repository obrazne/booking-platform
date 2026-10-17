import "server-only";
import { getTranslations } from "next-intl/server";
import type { GuestTodo } from "@/core/modules/types";
import { createClient } from "@/lib/supabase/server";

/** "Ohodnoťte pobyt" on a finished stay the guest may still review (Z43). */
export async function reviewTodos({
  reservationId,
}: {
  reservationId: string;
  locale: string;
}): Promise<GuestTodo[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_review_eligibility", { p_reservation_id: reservationId });
  if (data !== "ok") return [];
  const t = await getTranslations("modules.reviews.guest");
  return [{ key: "review", tone: "warn", text: t("todo") }];
}
