import { getLocale } from "next-intl/server";
import { buildBasis, itemText } from "@/core/invoice/basis";
import { basisFormat } from "@/core/invoice/load";
import { getActiveMembership } from "@/core/tenant/active";
import { getTenantInfo } from "@/core/tenant/info";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Podklady za mesiac (Z51) — CSV for the accountant: stays that ended in the month (by the date of departure), with
 * items, sums (VAT per rate for a VAT payer), payments and whether the issued document is uploaded. Owner and reception.
 */
export async function GET(request: Request) {
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role))
    return new Response(null, { status: 403 });
  const m = MONTH.exec(new URL(request.url).searchParams.get("mesiac") ?? "");
  if (!m) return new Response(null, { status: 400 });
  const from = `${m[1]}-${m[2]}-01`;
  const next = new Date(Date.UTC(Number(m[1]), Number(m[2]), 1)).toISOString().slice(0, 10);
  const [tenant, locale] = await Promise.all([getTenantInfo(active.tenantId), getLocale()]);
  const supabase = await createClient();
  const [{ data: rows, error }, { data: settings }, { labels, t, fmt }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        `id, number, status, currency, guest_name, guest_email, guest_phone, guest_country,
         property:properties(name), items:reservation_items!inner(check_in, check_out),
         lines:reservation_lines(kind, label, quantity, unit_amount_cents, amount_cents, vat_bp, sort),
         payments(provider, amount_cents, variable_symbol, status, received_at),
         documents(kind)`,
      )
      .eq("tenant_id", active.tenantId)
      .in("status", ["confirmed", "in_progress", "completed"])
      .gte("items.check_out", from)
      .lt("items.check_out", next)
      .eq("payments.purpose", "reservation")
      .order("number"),
    supabase
      .from("tenant_settings")
      .select("vat_payer")
      .eq("tenant_id", active.tenantId)
      .maybeSingle(),
    basisFormat(locale, tenant.timezone),
  ]);
  if (error) return new Response(null, { status: 500 });
  const decimal = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const csv = toCsv(
    [
      t("csv.number"),
      t("csv.guest"),
      t("csv.email"),
      t("csv.property"),
      t("csv.checkIn"),
      t("csv.checkOut"),
      t("csv.items"),
      t("csv.total"),
      t("csv.currency"),
      t("csv.vat"),
      t("csv.paid"),
      t("csv.open"),
      t("csv.payments"),
      t("csv.invoice"),
    ],
    (rows ?? []).map((r) => {
      const items = [...r.items].sort((a, b) => a.check_in.localeCompare(b.check_in));
      const b = buildBasis({
        number: r.number,
        currency: r.currency,
        buyer: {
          name: r.guest_name,
          email: r.guest_email,
          phone: r.guest_phone,
          country: r.guest_country,
        },
        stay: {
          property: r.property?.name ?? "",
          units: [],
          checkIn: items[0]?.check_in ?? null,
          checkOut: items.at(-1)?.check_out ?? null,
        },
        lines: r.lines,
        payments: r.payments,
        vatPayer: settings?.vat_payer ?? false,
      });
      const f = fmt(r.currency);
      return [
        r.number,
        r.guest_name,
        r.guest_email,
        b.stay.property,
        b.stay.checkIn ?? "",
        b.stay.checkOut ?? "",
        b.lines.map((l) => itemText(l, b, f)).join("; "),
        decimal(b.totalCents),
        r.currency,
        b.vatPayer
          ? b.vat
              .map((v) => `${f.rate(v.rateBp)}: ${decimal(v.baseCents)} + ${decimal(v.vatCents)}`)
              .join("; ")
          : labels.noVat,
        decimal(b.paidCents),
        decimal(b.openCents),
        b.payments
          .map((p) =>
            [p.date?.slice(0, 10), labels.provider(p.provider), p.vs, decimal(p.amountCents)]
              .filter(Boolean)
              .join(" "),
          )
          .join("; "),
        r.documents.some((d) => d.kind === "invoice") ? t("invoiceUploaded") : t("invoiceMissing"),
      ];
    }),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="podklady-${active.tenantSlug}-${m[1]}-${m[2]}.csv"`,
    },
  });
}
