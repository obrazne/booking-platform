import { getTranslations } from "next-intl/server";
import { PanelSection } from "@/core/admin/record-panel";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import type { SlotProps } from "@/core/modules/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { OrderDecision, SettleButton } from "./account-actions";
import { counts, type OrderStatus } from "./rules";

const TONE: Record<OrderStatus, string> = {
  ordered: "bg-[#f6ecdf] text-[#8a4a22]",
  awaiting_confirmation: "bg-[#f6ecdf] text-[#8a4a22]",
  confirmed: "bg-primary text-primary-foreground",
  declined: "bg-[#fbeceb] text-[#a8432f]",
  cancelled: "bg-[#eef0f3] text-[#3b4652]",
};

/**
 * "Účet pobytu" in the reservation panel (Z35, slot booking.detail.tabs): orders after the reservation with their
 * state, Potvrdiť / Zamietnuť, the sums (total, paid, open) and "Vyúčtovať".
 */
export async function StayAccountSection({ tenantId, locale, reservationId }: SlotProps) {
  if (!reservationId) return null;
  const t = await getTranslations("modules.upsell.account");
  const supabase = await createClient();
  const [{ data: orders }, { data: account }] = await Promise.all([
    supabase
      .from("reservation_orders")
      .select(
        "id, label, items, amount_cents, currency, service_date, payment_method, status, decline_reason, paid_at",
      )
      .eq("tenant_id", tenantId)
      .eq("reservation_id", reservationId)
      .order("created_at"),
    supabase.rpc("stay_account", { p_reservation_id: reservationId }).maybeSingle(),
  ]);
  const list = orders ?? [];
  const fmt = (cents: number, currency: string) => formatMoney(money(cents, currency), locale);
  const currency = account?.currency ?? list[0]?.currency ?? "EUR";
  const settleable = list
    .filter((o) => o.status === "confirmed" && !o.paid_at)
    .reduce((s, o) => s + o.amount_cents, 0);

  return (
    <PanelSection
      label={t("title")}
      aside={
        account && account.orders > 0 ? (
          <span className="text-muted-foreground text-[13px]">
            {[
              t("total", { amount: fmt(account.total_cents, currency) }),
              t("paid", { amount: fmt(account.paid_cents, currency) }),
              t("open", { amount: fmt(account.open_cents, currency) }),
            ].join(" · ")}
          </span>
        ) : null
      }
    >
      {list.length ? (
        <ul className="border-line grid rounded-[10px] border">
          {list.map((o) => {
            const status = o.status as OrderStatus;
            return (
              <li
                key={o.id}
                className="border-hair grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-ink font-semibold">
                    {o.label}
                    {o.items > 1 ? ` × ${o.items}` : ""}
                    {o.service_date
                      ? ` ${t("serviceDate", { date: formatDate(o.service_date, locale, "short") })}`
                      : ""}
                  </span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                    <span className="text-ink font-semibold tabular-nums">
                      {fmt(o.amount_cents, o.currency)}
                    </span>
                    <span>{t(`methods.${o.payment_method as "stay_account"}`)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap",
                        TONE[status],
                      )}
                    >
                      {t(`statuses.${status}`)}
                    </span>
                    {o.paid_at ? <span>{t("paidMark")}</span> : null}
                    {o.decline_reason ? <span>· {o.decline_reason}</span> : null}
                  </span>
                </span>
                {counts(status) && !o.paid_at ? (
                  <OrderDecision
                    id={o.id}
                    label={o.label}
                    canConfirm={status === "awaiting_confirmation" || status === "ordered"}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
      {settleable > 0 ? (
        <div className="flex justify-end">
          <SettleButton reservationId={reservationId} amountLabel={fmt(settleable, currency)} />
        </div>
      ) : null}
    </PanelSection>
  );
}
