import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import type { SlotProps } from "@/core/modules/types";
import { payBySquareSvg } from "@/core/payments/pay-by-square";
import { loadGuestUpsell } from "./load";
import { UpsellOffers } from "./offers";

/**
 * Upsell in the guest's stay (Z37, slot guest.stay.main): services to order and, when something is to be paid
 * by transfer now, the payment details with a QR code (same account and variable symbol as the reservation).
 */
export async function GuestStayOffers({ locale, reservationId, accessToken }: SlotProps) {
  if (!reservationId) return null;
  const data = await loadGuestUpsell(reservationId, locale, accessToken);
  if (!data || (!data.orderable && data.orders.length === 0) || data.offers.length === 0)
    return null;
  const t = await getTranslations("modules.upsell.guest");
  const tg = await getTranslations("guest.reservation");
  const { reservation: r } = data;
  // Ordered with "Zaplatiť teraz" and confirmed (an order the owner still has to confirm is not paid yet).
  const toPay = data.orders
    .filter((o) => o.paymentMethod === "transfer" && o.status === "confirmed" && !o.paidAt)
    .reduce((s, o) => s + o.amountCents, 0);
  const qr =
    toPay > 0 && data.bank
      ? await payBySquareSvg({
          iban: data.bank.iban,
          bic: data.bank.bic ?? undefined,
          beneficiary: data.bank.holder ?? data.tenantName,
          amountCents: toPay,
          currency: r.currency,
          variableSymbol: r.variableSymbol,
          note: t("payNote", { number: r.number }),
        }).catch(() => null)
      : null;
  const fmt = (cents: number) => formatMoney(money(cents, r.currency), locale);

  return (
    <>
      <UpsellOffers
        reservationId={r.id}
        token={accessToken}
        locale={locale}
        currency={r.currency}
        timeZone={data.timeZone}
        limitCents={data.limitCents}
        ownerName={data.ownerName}
        offers={data.offers}
        orders={data.orders}
      />
      {toPay > 0 && data.bank ? (
        <section
          aria-labelledby="upsell-pay"
          className="border-line grid gap-5 rounded-lg border bg-white p-6 sm:grid-cols-[minmax(0,1fr)_180px]"
        >
          <div className="grid content-start gap-3">
            <h3 id="upsell-pay" className="text-ink text-lg font-bold">
              {t("payTitle")}
            </h3>
            <p className="text-sm text-[#5a6672]">{t("payText")}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{tg("amount")}</dt>
              <dd className="text-base font-semibold tabular-nums">{fmt(toPay)}</dd>
              <dt className="text-muted-foreground">{tg("iban")}</dt>
              <dd className="font-mono break-all">
                {data.bank.iban
                  .replace(/\s/g, "")
                  .replace(/(.{4})/g, "$1 ")
                  .trim()}
              </dd>
              <dt className="text-muted-foreground">{tg("vs")}</dt>
              <dd className="font-mono">{r.variableSymbol}</dd>
              {data.bank.holder ? (
                <>
                  <dt className="text-muted-foreground">{tg("holder")}</dt>
                  <dd>{data.bank.holder}</dd>
                </>
              ) : null}
            </dl>
          </div>
          {qr ? (
            <div
              role="img"
              aria-label={tg("qrHint")}
              className="w-full max-w-[180px] justify-self-center rounded-md bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
