import "server-only";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { PanelSection, PanelSummary, type PanelContent } from "@/core/admin/record-panel";
import { formatDate, formatMoney } from "@/core/format/format";
import { loadGiftVoucher } from "@/core/gift-vouchers/query";
import { giftVoucherState } from "@/core/gift-vouchers/state";
import { money } from "@/core/money/money";
import { todayIso } from "@/core/pricing/dates";
import { getTenantInfo } from "@/core/tenant/info";
import { GiftVoucherActions, GiftVoucherEdit } from "./panel-actions";
import { GiftVoucherPill } from "./pill";

/**
 * Darčekový poukaz (Z78): value and balance, state, on whose name, until when, the team's note; where it was used
 * (reservations, returned after a cancellation); PDF, e-mail, edit, cancel.
 */
export async function giftVoucherPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, locale, tenant, v] = await Promise.all([
    getTranslations("giftVouchers"),
    getLocale(),
    getTenantInfo(active.tenantId),
    loadGiftVoucher(active.tenantId, id),
  ]);
  if (!v) return { body: <p className="text-muted-foreground text-sm">{t("emptyFilter")}</p> };
  const today = todayIso(tenant.timezone);
  const state = giftVoucherState(v, today);
  const fmt = (cents: number) => formatMoney(money(cents, v.currency), locale);
  const date = (d: string) => formatDate(d.slice(0, 10), locale, "short");
  const uses = [...(v.uses ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const usable = v.status === "active";

  return {
    label: v.code,
    header: (
      <>
        <span className="text-ink font-mono text-[13px] font-medium">{v.code}</span>
        <GiftVoucherPill state={state} label={t(`states.${state}`)} />
      </>
    ),
    actions: (
      <GiftVoucherActions
        id={v.id}
        code={v.code}
        usable={usable}
        pdfHref={`/admin/vouchers/${v.id}/pdf`}
      />
    ),
    body: (
      <div className="grid gap-6 text-sm font-normal [&>*]:min-w-0">
        <PanelSummary
          title={fmt(v.balance_cents)}
          subtitle={t("panel.balance", {
            balance: fmt(v.balance_cents),
            amount: fmt(v.amount_cents),
          })}
          facts={[
            { label: t("cols.recipient"), value: v.recipient_name ?? "—" },
            {
              label: t("cols.validUntil"),
              value: v.valid_until ? date(v.valid_until) : t("noExpiry"),
            },
            { label: t("cols.amount"), value: fmt(v.amount_cents) },
            { label: t("panel.created", { date: "" }).trim(), value: date(v.created_at) },
          ]}
        />
        {v.note ? <p className="text-[#3b3d42]">{v.note}</p> : null}

        <PanelSection label={t("panel.uses")}>
          {uses.length ? (
            <ul className="border-hair grid border-t" data-testid="voucher-uses">
              {uses.map((u) => (
                <li
                  key={u.id}
                  className="border-hair flex flex-wrap justify-between gap-3 border-b py-2.5"
                >
                  {u.reservation ? (
                    <Link
                      href={`/admin/reservations?panel=reservation:${u.reservation.id}`}
                      className="text-ink font-medium hover:underline"
                    >
                      {t("panel.use", {
                        number: u.reservation.number,
                        guest: u.reservation.guest_name,
                        amount: fmt(u.amount_cents),
                      })}
                    </Link>
                  ) : (
                    <span>{fmt(u.amount_cents)}</span>
                  )}
                  <span className="text-[13px] text-[#5a6672]">
                    {date(u.created_at)}
                    {u.returned_at ? ` · ${t("panel.returned")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("panel.noUses")}</p>
          )}
        </PanelSection>

        {usable ? (
          <PanelSection label={t("panel.edit")}>
            <GiftVoucherEdit
              id={v.id}
              recipient={v.recipient_name ?? ""}
              validUntil={v.valid_until ?? ""}
              note={v.note ?? ""}
            />
          </PanelSection>
        ) : (
          <p className="text-muted-foreground">{t("panel.cancelled")}</p>
        )}
      </div>
    ),
  };
}
