import { getTranslations } from "next-intl/server";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import type { SlotProps } from "@/core/modules/types";
import { counts } from "../rules";
import { AccountStrip } from "./account-strip";
import { loadGuestUpsell } from "./load";

/**
 * Orders of the stay account (Z37): ordered services with their state and how they are paid, and what is open on the
 * stay account (settled at departure). Null when there is nothing to show.
 */
async function accountParts({ locale, reservationId, accessToken }: SlotProps) {
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

  const lines = (
    <>
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
    </>
  );
  const head = (
    <>
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
    </>
  );
  return {
    t,
    r,
    lines,
    head,
    label: settled ? t("account.settled") : t("account.open"),
    amount: settled ? "✓" : fmt(open),
  };
}

/**
 * Green "Účet pobytu" card on the access-link page (Z37, slot guest.stay.aside): the stay and the orders. In the
 * account the stay page has its own card and gets only the orders (guest.stay.account, Z44).
 */
export async function GuestStayAccountCard(props: SlotProps) {
  if (!props.accessToken) return null;
  const parts = await accountParts(props);
  if (!parts) return null;
  const card = (
    <section
      aria-label={parts.t("account.title")}
      className="bg-surface-accent grid gap-3.5 rounded-lg px-6 py-[22px] text-white"
    >
      {parts.head}
      {parts.lines}
    </section>
  );
  return (
    <>
      <div className="hidden lg:block">{card}</div>
      <AccountStrip label={parts.label} amount={parts.amount} open={parts.t("account.title")}>
        {card}
      </AccountStrip>
    </>
  );
}

/** Orders inside the stay's own "Účet pobytu" card in the account (Z44, slot guest.stay.account). */
export async function GuestStayAccountLines(props: SlotProps) {
  const parts = await accountParts(props);
  if (!parts) return null;
  return (
    <>
      {parts.lines}
      <AccountStrip
        label={parts.label}
        amount={parts.amount}
        open={parts.t("account.title")}
        spacer={false}
      >
        <section
          aria-label={parts.t("account.title")}
          className="bg-surface-accent grid gap-3.5 rounded-lg px-6 py-[22px] text-white"
        >
          {parts.lines}
        </section>
      </AccountStrip>
    </>
  );
}
