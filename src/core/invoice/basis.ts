/**
 * "Podklad na doklad" (Z51, A5): what the client copies into their own invoicing tool to issue the tax document by
 * hand. Built only from the frozen reservation lines (never recalculated) and the payments — so the sum of the items
 * is the price of the reservation. Prices are with VAT; for a VAT payer the base and the VAT per rate are derived.
 * Not a tax document itself.
 */

export type BasisLineInput = {
  kind: string;
  label: string;
  quantity: number;
  unit_amount_cents: number;
  amount_cents: number;
  vat_bp: number;
  sort?: number;
};

export type BasisPaymentInput = {
  provider: string;
  amount_cents: number;
  variable_symbol: string | null;
  status: string;
  received_at: string | null;
};

export type BasisLine = {
  kind: string;
  label: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
  vatBp: number;
};

export type VatRow = { rateBp: number; baseCents: number; vatCents: number; totalCents: number };

export type InvoiceBasis = {
  number: string;
  currency: string;
  buyer: { name: string; email: string | null; phone: string | null; country: string | null };
  stay: { property: string; units: string[]; checkIn: string | null; checkOut: string | null };
  lines: BasisLine[];
  /** Refundable deposit — not part of the price, so not on the document. */
  depositCents: number;
  totalCents: number;
  vatPayer: boolean;
  vat: VatRow[];
  payments: { date: string | null; provider: string; vs: string | null; amountCents: number }[];
  paidCents: number;
  openCents: number;
};

/** Base and VAT of a price with VAT (rounded to cents; the VAT is the rest, so base + VAT = price). */
export function splitVat(
  grossCents: number,
  rateBp: number,
): { baseCents: number; vatCents: number } {
  if (!rateBp) return { baseCents: grossCents, vatCents: 0 };
  const baseCents = Math.round((grossCents * 10000) / (10000 + rateBp));
  return { baseCents, vatCents: grossCents - baseCents };
}

/** VAT summary per rate (sorted from the highest rate) — sums per rate first, then split, as on a document. */
export function vatSummary(lines: readonly BasisLine[]): VatRow[] {
  const byRate = new Map<number, number>();
  for (const l of lines) byRate.set(l.vatBp, (byRate.get(l.vatBp) ?? 0) + l.amountCents);
  return [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rateBp, totalCents]) => ({ rateBp, totalCents, ...splitVat(totalCents, rateBp) }));
}

export function buildBasis(input: {
  number: string;
  currency: string;
  buyer: InvoiceBasis["buyer"];
  stay: InvoiceBasis["stay"];
  lines: readonly BasisLineInput[];
  payments: readonly BasisPaymentInput[];
  vatPayer: boolean;
}): InvoiceBasis {
  const sorted = [...input.lines].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const lines: BasisLine[] = sorted
    .filter((l) => l.kind !== "deposit")
    .map((l) => ({
      kind: l.kind,
      label: l.label,
      quantity: l.quantity,
      unitCents: l.unit_amount_cents,
      amountCents: l.amount_cents,
      vatBp: input.vatPayer ? l.vat_bp : 0,
    }));
  const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
  const received = input.payments
    .filter((p) => p.status === "received")
    .sort((a, b) => (a.received_at ?? "").localeCompare(b.received_at ?? ""));
  const paidCents = received.reduce((s, p) => s + p.amount_cents, 0);
  return {
    number: input.number,
    currency: input.currency,
    buyer: input.buyer,
    stay: input.stay,
    lines,
    depositCents: sorted
      .filter((l) => l.kind === "deposit")
      .reduce((s, l) => s + l.amount_cents, 0),
    totalCents,
    vatPayer: input.vatPayer,
    vat: input.vatPayer ? vatSummary(lines) : [],
    payments: received.map((p) => ({
      date: p.received_at,
      provider: p.provider,
      vs: p.variable_symbol,
      amountCents: p.amount_cents,
    })),
    paidCents,
    openCents: Math.max(0, totalCents - paidCents),
  };
}

export type BasisLabels = {
  title: string;
  notTaxDocument: string;
  buyer: string;
  stay: string;
  items: string;
  total: string;
  vatSummary: string;
  vatRow: (rate: string, base: string, vat: string) => string;
  noVat: string;
  payments: string;
  paid: string;
  open: string;
  noPayments: string;
  deposit: string;
  vs: string;
  provider: (p: string) => string;
};

/** Plain text for pasting into an invoicing tool: sections, one item per line with "quantity × unit price". */
export function basisText(
  b: InvoiceBasis,
  l: BasisLabels,
  fmt: {
    money: (cents: number) => string;
    date: (iso: string) => string;
    rate: (bp: number) => string;
  },
): string {
  const out: string[] = [`${l.title} ${b.number}`, l.notTaxDocument, ""];
  out.push(l.buyer.toUpperCase(), b.buyer.name);
  for (const v of [b.buyer.email, b.buyer.phone, b.buyer.country]) if (v) out.push(v);
  out.push(
    "",
    l.stay.toUpperCase(),
    [b.stay.property, ...b.stay.units].filter(Boolean).join(" · "),
  );
  if (b.stay.checkIn && b.stay.checkOut)
    out.push(`${fmt.date(b.stay.checkIn)} – ${fmt.date(b.stay.checkOut)}`);
  out.push("", l.items.toUpperCase());
  for (const line of b.lines) out.push(itemText(line, b, fmt));
  out.push(`${l.total}: ${fmt.money(b.totalCents)}`);
  if (b.depositCents) out.push(`${l.deposit}: ${fmt.money(b.depositCents)}`);
  out.push("", l.vatSummary.toUpperCase());
  if (b.vatPayer)
    for (const r of b.vat)
      out.push(l.vatRow(fmt.rate(r.rateBp), fmt.money(r.baseCents), fmt.money(r.vatCents)));
  else out.push(l.noVat);
  out.push("", l.payments.toUpperCase());
  if (!b.payments.length) out.push(l.noPayments);
  for (const p of b.payments)
    out.push(
      [
        p.date ? fmt.date(p.date) : "",
        l.provider(p.provider),
        p.vs ? `${l.vs} ${p.vs}` : "",
        fmt.money(p.amountCents),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  out.push(`${l.paid}: ${fmt.money(b.paidCents)}`, `${l.open}: ${fmt.money(b.openCents)}`);
  return out.join("\n");
}

/** One item: "Ubytovanie — 3 × 100,00 € = 300,00 € (DPH 5 %)". */
export function itemText(
  line: BasisLine,
  b: Pick<InvoiceBasis, "vatPayer">,
  fmt: { money: (cents: number) => string; rate: (bp: number) => string },
): string {
  const qty = line.quantity > 1 ? ` — ${line.quantity} × ${fmt.money(line.unitCents)} =` : " —";
  const vat = b.vatPayer ? ` (DPH ${fmt.rate(line.vatBp)})` : "";
  return `${line.label}${qty} ${fmt.money(line.amountCents)}${vat}`;
}
