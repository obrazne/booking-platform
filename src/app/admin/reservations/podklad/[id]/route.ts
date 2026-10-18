import { getLocale } from "next-intl/server";
import { z } from "zod";
import { itemText } from "@/core/invoice/basis";
import { basisFormat, loadInvoiceBasis } from "@/core/invoice/load";
import { renderFormPdf, type FormSection } from "@/core/pdf/form-pdf";
import { getActiveMembership } from "@/core/tenant/active";
import { getTenantInfo } from "@/core/tenant/info";

/**
 * "Podklad na doklad" as a PDF (Z51) — for the reservation, or with `?zdroj=ucet` for the settlement of the stay
 * account. Marked "not a tax document"; the client issues the document in their own tool. Owner and reception.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/admin/reservations/podklad/[id]">,
) {
  const { id } = await params;
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role) || !z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const source =
    new URL(request.url).searchParams.get("zdroj") === "ucet" ? "stay_account" : "reservation";
  const [tenant, locale] = await Promise.all([getTenantInfo(active.tenantId), getLocale()]);
  const [basis, { labels, t, fmt }] = await Promise.all([
    loadInvoiceBasis(active.tenantId, id, source),
    basisFormat(locale, tenant.timezone),
  ]);
  if (!basis) return new Response(null, { status: 404 });
  const f = fmt(basis.currency);
  const opt = (rows: [string, string | null][]) =>
    rows.filter((r): r is [string, string] => !!r[1]);

  const sections: FormSection[] = [
    {
      heading: labels.buyer,
      rows: opt([
        [t("name"), basis.buyer.name],
        [t("email"), basis.buyer.email],
        [t("phone"), basis.buyer.phone],
        [t("country"), basis.buyer.country],
      ]),
    },
    {
      heading: labels.stay,
      rows: opt([
        [t("property"), basis.stay.property],
        [t("unit"), basis.stay.units.join(", ") || null],
        [
          t("dates"),
          basis.stay.checkIn && basis.stay.checkOut
            ? `${f.date(basis.stay.checkIn)} – ${f.date(basis.stay.checkOut)}`
            : null,
        ],
      ]),
    },
    {
      heading: labels.items,
      rows: [
        ...basis.lines.map((l): [string, string] => {
          const [label, rest] = splitItem(itemText(l, basis, f), l.label);
          return [label, rest];
        }),
        [labels.total, f.money(basis.totalCents)],
        ...(basis.depositCents
          ? [[labels.deposit, f.money(basis.depositCents)] as [string, string]]
          : []),
      ],
    },
    {
      heading: labels.vatSummary,
      rows: basis.vatPayer
        ? basis.vat.map((r): [string, string] => [
            f.rate(r.rateBp),
            t("vatShort", { base: f.money(r.baseCents), vat: f.money(r.vatCents) }),
          ])
        : [[labels.vatSummary, labels.noVat]],
    },
    {
      heading: labels.payments,
      rows: [
        ...(basis.payments.length
          ? basis.payments.map((p): [string, string] => [
              [p.date ? f.date(p.date) : "", labels.provider(p.provider)]
                .filter(Boolean)
                .join(" · "),
              [p.vs ? `${labels.vs} ${p.vs}` : "", f.money(p.amountCents)]
                .filter(Boolean)
                .join(" · "),
            ])
          : [[labels.payments, labels.noPayments] as [string, string]]),
        [labels.paid, f.money(basis.paidCents)],
        [labels.open, f.money(basis.openCents)],
      ],
    },
  ];
  const pdf = await renderFormPdf({
    title: `${source === "stay_account" ? t("stayAccountTitle") : labels.title} ${basis.number}`,
    subtitle: [
      t("supplier", { name: tenant.name }),
      t("pdfIssued", { date: f.date(new Date().toISOString()) }),
    ].join(" · "),
    sections,
    footer: labels.notTaxDocument,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="podklad-${basis.number}${source === "stay_account" ? "-ucet" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** "Ubytovanie — 3 × 100 € = 300 € (DPH 5 %)" → ["Ubytovanie", "3 × 100 € = 300 € (DPH 5 %)"]. */
function splitItem(text: string, label: string): [string, string] {
  return [label, text.slice(label.length).replace(/^ — /, "")];
}
