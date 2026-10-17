import { getTranslations } from "next-intl/server";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import type { SlotProps } from "@/core/modules/types";
import { counts } from "../rules";
import { AccountStrip } from "./account-strip";
import { loadGuestUpsell } from "./load";

/**
 * Green "Účet pobytu" card (Z37, slot guest.stay.aside): the stay, ordered services with their state and how they
 * are paid, and what is open on the stay account (settled at departure). Phones show a green strip at the bottom
 * that opens the same card.
 */
export async function GuestStayAccountCard({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const data = await loadGuestUpsell(reservationId, locale, accessToken);
  if (!data) return null;
  const active = data.orders.filter((o) => counts(o.status));
  if (!data.orderable && active.length === 0) return null;
  if (data.offers.length === 0 && active.length === 0) return null;
  const t = await getTranslations("modules.upsell.guest");
  const tb = await getTranslations("guest.booking");
  const { reservation: r } = data;
  const fmt = (cents: number) => formatMoney(money(cents, r.currency), locale);
  // As in the design: what waits for the owner's confirmation is not counted until confirmed.
  const open = active
    .filter(
      (o) =>
        o.status !== "awaiting_confirmation" && !o.paidAt && o.paymentMethod === "stay_account",
    )
    .reduce((s, o) => s + o.amountCents, 0);
  const settled = active.length > 0 && active.every((o) => o.paidAt);
  const settledAt = settled
    ? active
        .map((o) => o.paidAt!)
        .sort()
        .at(-1)!
    : null;

  const card = (
    <section
      aria-label={t("account.title")}
      className="bg-surface-accent grid gap-3.5 rounded-lg px-6 py-[22px] text-white"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-white uppercase">
          {t("account.title")}
        </span>
        <span className="font-mono text-[11px] text-white">{r.number}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-white">
          {t("account.stay", { nights: tb("nights", { count: r.nights }) })}
        </span>
        <span className="font-medium whitespace-nowrap tabular-nums">
          {fmt(r.totalCents)} {r.paid ? <span className="text-white">✓</span> : null}
        </span>
      </div>
      {active.map((o) => (
        <div key={o.id} className="flex justify-between gap-3 text-sm">
          <span className="text-white">
            {o.label}
            {o.serviceDate ? ` · ${formatDate(o.serviceDate, locale, "dayMonth")}` : ""}
            <span className="block text-xs text-white">
              {[
                o.status === "awaiting_confirmation" ? t("account.awaiting") : null,
                o.paidAt
                  ? t("account.paid")
                  : o.paymentMethod === "stay_account"
                    ? t("methods.stay_account")
                    : t("account.transferDue"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="font-medium whitespace-nowrap tabular-nums">{fmt(o.amountCents)}</span>
        </div>
      ))}
      <div className="grid gap-1 border-t border-white/20 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-white">
            {settled ? t("account.settled") : t("account.open")}
          </span>
          <span className="text-[26px] font-extrabold tracking-tight tabular-nums">
            {settled ? "✓" : fmt(open)}
          </span>
        </div>
        <span className="text-xs leading-normal text-white">
          {settled
            ? t("account.settledNote", { date: formatDate(settledAt!.slice(0, 10), locale) })
            : t("account.note", { limit: fmt(data.limitCents) })}
        </span>
      </div>
    </section>
  );

  return (
    <>
      <div className="hidden lg:block">{card}</div>
      <AccountStrip
        label={settled ? t("account.settled") : t("account.open")}
        amount={settled ? "✓" : fmt(open)}
        open={t("account.title")}
      >
        {card}
      </AccountStrip>
    </>
  );
}
