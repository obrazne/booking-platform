import { describe, expect, it } from "vitest";
import { basisText, buildBasis, splitVat, vatSummary, type BasisLabels } from "./basis";

const lines = [
  {
    kind: "accommodation",
    label: "Ubytovanie",
    quantity: 3,
    unit_amount_cents: 10000,
    amount_cents: 30000,
    vat_bp: 500,
    sort: 0,
  },
  {
    kind: "fee",
    label: "Upratovanie",
    quantity: 1,
    unit_amount_cents: 4000,
    amount_cents: 4000,
    vat_bp: 2300,
    sort: 1,
  },
  {
    kind: "service",
    label: "Raňajky",
    quantity: 4,
    unit_amount_cents: 1250,
    amount_cents: 5000,
    vat_bp: 2300,
    sort: 2,
  },
  {
    kind: "discount",
    label: "Zľava",
    quantity: 1,
    unit_amount_cents: -3000,
    amount_cents: -3000,
    vat_bp: 500,
    sort: 3,
  },
  {
    kind: "tax",
    label: "Daň za ubytovanie",
    quantity: 6,
    unit_amount_cents: 200,
    amount_cents: 1200,
    vat_bp: 0,
    sort: 4,
  },
  {
    kind: "deposit",
    label: "Vratná záloha",
    quantity: 1,
    unit_amount_cents: 20000,
    amount_cents: 20000,
    vat_bp: 0,
    sort: 5,
  },
];
const reservationTotal = 30000 + 4000 + 5000 - 3000 + 1200; // without the deposit, as the reservation price

const input = (vatPayer: boolean) => ({
  number: "2026-0042",
  currency: "EUR",
  buyer: { name: "Jana Testová", email: "jana@booking-platform.test", phone: null, country: "SK" },
  stay: {
    property: "Chalet",
    units: ["Celý chalet"],
    checkIn: "2026-11-02",
    checkOut: "2026-11-05",
  },
  lines,
  payments: [
    {
      provider: "bank_transfer",
      amount_cents: 20000,
      variable_symbol: "20260042",
      status: "received",
      received_at: "2026-10-20T10:00:00Z",
    },
    {
      provider: "bank_transfer",
      amount_cents: 17200,
      variable_symbol: "20260042",
      status: "pending",
      received_at: null,
    },
  ],
  vatPayer,
});

describe("podklad na doklad", () => {
  it("items add up to the reservation price; the deposit is apart", () => {
    const b = buildBasis(input(false));
    expect(b.totalCents).toBe(reservationTotal);
    expect(b.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(reservationTotal);
    expect(b.lines.map((l) => l.kind)).not.toContain("deposit");
    expect(b.depositCents).toBe(20000);
  });

  it("only received payments count", () => {
    const b = buildBasis(input(false));
    expect(b.payments).toHaveLength(1);
    expect(b.paidCents).toBe(20000);
    expect(b.openCents).toBe(reservationTotal - 20000);
  });

  it("not a VAT payer: no VAT summary, rates zeroed", () => {
    const b = buildBasis(input(false));
    expect(b.vat).toEqual([]);
    expect(b.lines.every((l) => l.vatBp === 0)).toBe(true);
  });

  it("VAT payer: per rate base + VAT = total, sums match the price", () => {
    const b = buildBasis(input(true));
    expect(b.vat.map((r) => r.rateBp)).toEqual([2300, 500, 0]);
    for (const r of b.vat) expect(r.baseCents + r.vatCents).toBe(r.totalCents);
    expect(b.vat.reduce((s, r) => s + r.totalCents, 0)).toBe(b.totalCents);
    const r23 = b.vat.find((r) => r.rateBp === 2300)!;
    expect(r23.totalCents).toBe(9000);
    expect(r23.baseCents).toBe(7317);
    expect(r23.vatCents).toBe(1683);
  });

  it("splitVat rounds the base and keeps the sum", () => {
    expect(splitVat(1000, 2000)).toEqual({ baseCents: 833, vatCents: 167 });
    expect(splitVat(999, 0)).toEqual({ baseCents: 999, vatCents: 0 });
    expect(vatSummary([])).toEqual([]);
  });

  it("text for copying lists items, sums and payments", () => {
    const labels: BasisLabels = {
      title: "Podklad na doklad",
      notTaxDocument: "Nie je daňový doklad.",
      buyer: "Odberateľ",
      stay: "Pobyt",
      items: "Položky",
      total: "Spolu",
      vatSummary: "DPH",
      vatRow: (rate, base, vat) => `${rate}: základ ${base}, DPH ${vat}`,
      noVat: "Nie je platiteľ DPH",
      payments: "Platby",
      paid: "Zaplatené",
      open: "Zostáva",
      noPayments: "Žiadne",
      deposit: "Vratná záloha",
      vs: "VS",
      provider: (p) => (p === "bank_transfer" ? "prevodom" : p),
    };
    const text = basisText(buildBasis(input(true)), labels, {
      money: (c) => `${(c / 100).toFixed(2)} €`,
      date: (iso) => iso.slice(0, 10),
      rate: (bp) => `${bp / 100} %`,
    });
    expect(text).toContain("Podklad na doklad 2026-0042");
    expect(text).toContain("Ubytovanie — 3 × 100.00 € = 300.00 € (DPH 5 %)");
    expect(text).toContain("Spolu: 372.00 €");
    expect(text).toContain("2026-10-20 · prevodom · VS 20260042 · 200.00 €");
    expect(text).toContain("Zostáva: 172.00 €");
    expect(text).not.toContain("17200");
  });
});
