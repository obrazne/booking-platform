import "server-only";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelSection } from "@/core/admin/record-panel";
import { getTenantInfo } from "@/core/tenant/info";
import { cn } from "@/lib/utils";
import { basisText } from "./basis";
import { CopyBasisButton } from "./copy-button";
import { basisFormat, loadInvoiceBasis, type BasisSource } from "./load";

/** Link to the PDF of the basis (route in the reservations admin). */
export function basisPdfHref(reservationId: string, source: BasisSource = "reservation") {
  return `/admin/reservations/podklad/${reservationId}${source === "stay_account" ? "?zdroj=ucet" : ""}`;
}

/**
 * "Podklad na doklad" in the reservation panel (Z51): sums (with VAT per rate for a VAT payer), paid / open,
 * Kopírovať (text for the invoicing tool) and Stiahnuť PDF; for the reservation also whether the issued document is
 * uploaded. The same for the settlement of the stay account (upsell, `source="stay_account"`), without a heading.
 */
export async function InvoiceBasisSection({
  tenantId,
  reservationId,
  locale,
  source = "reservation",
  invoiceUploaded,
}: {
  tenantId: string;
  reservationId: string;
  locale: string;
  source?: BasisSource;
  /** Reservation only: an issued document (kind invoice) is among its documents. */
  invoiceUploaded?: boolean;
}) {
  const tenant = await getTenantInfo(tenantId);
  const [basis, { labels, t, fmt }] = await Promise.all([
    loadInvoiceBasis(tenantId, reservationId, source),
    basisFormat(locale, tenant.timezone),
  ]);
  if (!basis || (source === "stay_account" && !basis.lines.length)) return null;
  const f = fmt(basis.currency);
  const text = basisText(basis, labels, f);
  const facts: [string, string][] = [
    [labels.total, f.money(basis.totalCents)],
    ...basis.vat.map((r): [string, string] => [
      `${labels.vatSummary} ${f.rate(r.rateBp)}`,
      t("vatShort", { base: f.money(r.baseCents), vat: f.money(r.vatCents) }),
    ]),
    [labels.paid, f.money(basis.paidCents)],
    [labels.open, f.money(basis.openCents)],
  ];

  const body = (
    <div className="grid gap-3">
      <div className="surface grid gap-1.5 px-4 py-3 text-sm">
        <dl className="grid gap-1.5">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-ink font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {!basis.vatPayer ? <p className="text-muted-foreground text-xs">{labels.noVat}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyBasisButton text={text} />
        <Button asChild variant="outline">
          <a href={basisPdfHref(reservationId, source)} target="_blank" rel="noreferrer">
            <Download /> {t("download")}
          </a>
        </Button>
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">{t("preview")}</summary>
        <pre className="surface mt-2 px-4 py-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
          {text}
        </pre>
      </details>
    </div>
  );

  if (source === "stay_account")
    return (
      <div className="grid gap-2">
        <h4 className="text-ink text-sm font-semibold">{t("stayAccountTitle")}</h4>
        {body}
      </div>
    );
  return (
    <PanelSection
      label={t("title")}
      aside={
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            invoiceUploaded ? "bg-primary text-primary-foreground" : "bg-[#f6ecdf] text-[#8a4a22]",
          )}
        >
          {invoiceUploaded ? t("invoiceUploaded") : t("invoiceMissing")}
        </span>
      }
    >
      <p className="text-muted-foreground text-[13px]">{t("lead")}</p>
      {body}
    </PanelSection>
  );
}
