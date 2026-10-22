import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { createClient } from "@/lib/supabase/server";
import { buildBasis, splitForVoucher, type BasisLabels, type InvoiceBasis } from "./basis";

/** What the basis is for: the reservation (its frozen lines) or the settlement of the stay account (upsell orders). */
export type BasisSource = "reservation" | "stay_account" | "voucher";

/**
 * Basis of one reservation as the signed-in team member sees it (RLS): lines or confirmed orders, received payments
 * of the same purpose, the client's VAT setting. Null when the reservation is not the tenant's.
 */
export async function loadInvoiceBasis(
  tenantId: string,
  reservationId: string,
  source: BasisSource = "reservation",
): Promise<InvoiceBasis | null> {
  const supabase = await createClient();
  const [{ data: r }, { data: settings }, orders] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        `number, currency, guest_name, guest_email, guest_phone, guest_country, billing_company,
         billing_company_id, billing_tax_id, billing_vat_id, billing_address, voucher_amount_cents,
         voucher_company, voucher_company_id, voucher_tax_id, voucher_vat_id, voucher_address,
         property:properties(name), items:reservation_items(check_in, check_out, unit:units(name)),
         lines:reservation_lines(kind, label, quantity, unit_amount_cents, amount_cents, vat_bp, sort),
         payments(provider, amount_cents, variable_symbol, status, received_at)`,
      )
      .eq("tenant_id", tenantId)
      .eq("id", reservationId)
      .eq("payments.purpose", source === "stay_account" ? "stay_account" : "reservation")
      .maybeSingle(),
    supabase.from("tenant_settings").select("vat_payer").eq("tenant_id", tenantId).maybeSingle(),
    source === "stay_account"
      ? supabase
          .from("reservation_orders")
          .select("label, quantity, unit_amount_cents, amount_cents, vat_bp, created_at")
          .eq("tenant_id", tenantId)
          .eq("reservation_id", reservationId)
          .eq("status", "confirmed")
          .order("created_at")
          .then(({ data }) => data ?? [])
      : Promise.resolve(null),
  ]);
  if (!r) return null;
  // Z77: with a recreation voucher — the voucher to its company, the rest to the guest.
  const voucherCents = source === "stay_account" ? null : r.voucher_amount_cents;
  if (source === "voucher" && !voucherCents) return null;
  const split = voucherCents ? splitForVoucher(r.lines, voucherCents) : null;
  const isVoucherPayment = (p: { provider: string }) => p.provider === "recreation_voucher";
  const items = [...r.items].sort((a, b) => a.check_in.localeCompare(b.check_in));
  return buildBasis({
    number: r.number,
    currency: r.currency,
    buyer: {
      name: r.guest_name,
      email: r.guest_email,
      phone: r.guest_phone,
      country: r.guest_country,
      company:
        source === "voucher"
          ? {
              name: r.voucher_company ?? "",
              companyId: r.voucher_company_id,
              taxId: r.voucher_tax_id,
              vatId: r.voucher_vat_id,
              address: r.voucher_address,
            }
          : r.billing_company
            ? {
                name: r.billing_company,
                companyId: r.billing_company_id,
                taxId: r.billing_tax_id,
                vatId: r.billing_vat_id,
                address: r.billing_address,
              }
            : null,
    },
    stay: {
      property: r.property?.name ?? "",
      units: [...new Set(items.map((i) => i.unit?.name).filter((n): n is string => !!n))],
      checkIn: items[0]?.check_in ?? null,
      checkOut:
        items
          .map((i) => i.check_out)
          .sort()
          .at(-1) ?? null,
    },
    lines: orders
      ? orders.map((o, i) => ({ kind: "service", ...o, sort: i }))
      : split
        ? source === "voucher"
          ? split.voucher
          : split.rest
        : r.lines,
    payments: split
      ? r.payments.filter((p) => (source === "voucher") === isVoucherPayment(p))
      : r.payments,
    vatPayer: settings?.vat_payer ?? false,
  });
}

/** Labels and formatting of the basis in the admin's language (text for copying, PDF, CSV). */
export async function basisFormat(locale: string, timeZone: string) {
  const t = await getTranslations("invoice");
  const labels: BasisLabels = {
    title: t("title"),
    notTaxDocument: t("notTaxDocument"),
    buyer: t("buyer"),
    stay: t("stay"),
    items: t("items"),
    total: t("total"),
    vatSummary: t("vatSummary"),
    vatRow: (rate, base, vat) => t("vatRow", { rate, base, vat }),
    noVat: t("noVat"),
    payments: t("payments"),
    paid: t("paid"),
    open: t("open"),
    noPayments: t("noPayments"),
    deposit: t("deposit"),
    vs: t("vs"),
    companyId: t("companyId"),
    taxId: t("taxId"),
    vatId: t("vatId"),
    provider: (p) =>
      (
        ["bank_transfer", "card", "on_site", "recreation_voucher", "gift_voucher"] as const
      ).includes(p as "card")
        ? t(
            `providers.${p as "bank_transfer" | "card" | "on_site" | "recreation_voucher" | "gift_voucher"}`,
          )
        : p,
  };
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone });
  return {
    labels,
    t,
    fmt: (currency: string) => ({
      money: (cents: number) => formatMoney(money(cents, currency), locale),
      // Stay dates are plain days; payment times are moments shown in the client's timezone.
      date: (iso: string) =>
        iso.length === 10 ? formatDate(iso, locale) : dateFmt.format(new Date(iso)),
      rate: (bp: number) => `${(bp / 100).toLocaleString(locale)} %`,
    }),
  };
}
