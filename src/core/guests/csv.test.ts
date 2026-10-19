import { describe, expect, it } from "vitest";
import { guestsCsv, type CsvGuest } from "./csv";

const t = (k: string) => k;
const rows: CsvGuest[] = [
  {
    email: "jana@example.invalid",
    name: "Jana",
    phone: "+421900000000",
    country: "SK",
    language: "sk",
    consent: true,
    stays: 3,
    lastStay: "2026-08-14",
    nextStay: "2026-12-22",
    spentCents: 985000,
    source: "booking",
  },
  {
    email: "peter@example.invalid",
    name: null,
    phone: null,
    country: null,
    consent: false,
    stays: 1,
    lastStay: "2026-02-10",
    nextStay: null,
    spentCents: 0,
    source: "manual",
  },
];

describe("export of guests (Z68)", () => {
  it("only with the consent: the date and the source of the consent, nobody without it", () => {
    const csv = guestsCsv(
      "consent",
      rows,
      new Map([["jana@example.invalid", { at: "2025-03-02T10:00:00Z", source: "booking" }]]),
      t,
      (s) => `src:${s}`,
    );
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("email;name;phone;country;language;consentAt;consentSource");
    expect(lines).toHaveLength(2);
    // A phone starting with + is protected against formulas in Excel.
    expect(lines[1]).toBe("jana@example.invalid;Jana;'+421900000000;SK;sk;2025-03-02;src:booking");
    expect(csv).not.toContain("peter@");
  });

  it("everyone: stays, spending with a comma, consent and the guests added by hand", () => {
    const lines = guestsCsv("all", rows, new Map(), t, t).replace(/^﻿/, "").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(";3;2026-08-14;2026-12-22;9850,00;yes;");
    expect(lines[2]).toBe("peter@example.invalid;;;;;1;2026-02-10;;0,00;no;yes");
  });
});
