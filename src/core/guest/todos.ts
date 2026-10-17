import "server-only";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate, formatDateTime, formatMoney } from "@/core/format/format";
import { moduleGuestTodos } from "@/core/modules/registry";
import type { GuestTodo } from "@/core/modules/types";
import { money } from "@/core/money/money";
import { addDays, todayIso } from "@/core/pricing/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStays, requireGuest, type Stay } from "./zone";

/**
 * "What to do" for one stay of the signed-in guest (account v2.4, Z43): payment and arrival instructions from the
 * core, the rest from enabled modules (check-in, ordered services, review). Finished stays only ask for a review.
 */
export const stayTodos = cache(async (stayId: string): Promise<GuestTodo[]> => {
  const { tenant, supabase } = await requireGuest();
  const stay = (await listStays()).find((s) => s.id === stayId);
  if (!stay || stay.status === "cancelled") return [];
  const [t, locale] = await Promise.all([getTranslations("guest.account.todo"), getLocale()]);
  const today = todayIso();
  const past = stay.checkOut < today || stay.status === "completed";
  const todos: GuestTodo[] = [];
  if (!past) {
    if (stay.status === "pending_payment") {
      todos.push({
        key: "pay",
        tone: "warn",
        text: stay.payment_due_at
          ? t("payBy", {
              amount: formatMoney(money(stay.total_cents, stay.currency), locale),
              date: formatDateTime(stay.payment_due_at, locale, "Europe/Bratislava", "short"),
            })
          : t("pay", { amount: formatMoney(money(stay.total_cents, stay.currency), locale) }),
      });
    } else {
      const [{ data: visible }, { data: settings }] = await Promise.all([
        supabase.rpc("arrival_instructions_visible", { p_reservation_id: stay.id }),
        createAdminClient()
          .from("tenant_settings")
          .select("arrival_email_days_before")
          .eq("tenant_id", tenant.id)
          .maybeSingle(),
      ]);
      const from = addDays(stay.checkIn, -(settings?.arrival_email_days_before ?? 3));
      todos.push({
        key: "instructions",
        tone: "info",
        text: visible
          ? t("instructionsReady")
          : t("instructionsFrom", {
              date: formatDate(from > today ? from : today, locale, "short"),
            }),
      });
    }
  }
  const fromModules = await moduleGuestTodos(tenant.id, stay.id, locale);
  return [
    ...todos,
    ...fromModules.filter((x) => !past || x.key === "review" || x.key === "message"),
  ];
});

/** Number of things the guest should do across their stays — the badge on "Pobyty". */
export async function accountBadge(stays: Stay[]): Promise<number> {
  const lists = await Promise.all(stays.map((s) => stayTodos(s.id)));
  return lists.flat().filter((x) => x.tone === "warn").length;
}
