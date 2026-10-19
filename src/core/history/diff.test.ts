import { describe, expect, it } from "vitest";
import { changes, formatValue, recordName } from "./diff";

describe("history diff", () => {
  it("lists only changed fields, in words, without bookkeeping columns", () => {
    const before = {
      id: "x",
      tenant_id: "t",
      name: { sk: "Raňajky" },
      amount_cents: 1500,
      active: true,
      updated_at: "a",
    };
    const after = { ...before, amount_cents: 1800, active: false, updated_at: "b" };
    const spaces = (v: string) => v.replace(/\s/g, " ");
    expect(
      changes(before, after).map((c) => ({
        ...c,
        before: spaces(c.before),
        after: spaces(c.after),
      })),
    ).toEqual([
      { field: "amount_cents", before: "15,00 €", after: "18,00 €" },
      { field: "active", before: "áno", after: "nie" },
    ]);
  });

  it("an insert shows the record's fields, foreign keys hidden", () => {
    const rows = changes(null, { id: "x", property_id: "p", name: { sk: "Zima" }, sort: 2 });
    expect(rows.map((r) => r.field)).toEqual(["name", "sort"]);
    expect(rows[0]).toEqual({ field: "name", before: "—", after: "Zima" });
  });

  it("values: stay ranges, percent, long texts", () => {
    expect(formatValue("nights", "[2027-01-09,2027-01-12)")).toBe("9.–12. 1. 2027");
    expect(formatValue("nights", "[2026-10-30,2026-11-02)")).toBe("30. 10.–2. 11. 2026");
    expect(formatValue("nights", "[2026-12-30,2027-01-02)")).toBe("30. 12. 2026–2. 1. 2027");
    expect(formatValue("check_in", "2026-10-16")).toBe("16. 10. 2026");
    expect(formatValue("received_at", "2026-10-16T12:05:00+00:00").replace(/\s/g, " ")).toBe(
      "16. 10. 2026 14:05",
    );
    expect(formatValue("portal_commission_bp", 1500)).toBe("15 %");
    expect(formatValue("description", "x".repeat(200))).toHaveLength(120);
    expect(formatValue("label", null)).toBe("—");
  });

  it("names a record by its name, label or number", () => {
    expect(recordName({ name: { sk: "Raňajky" } })).toBe("Raňajky");
    expect(recordName({ number: "2026-0089" })).toBe("2026-0089");
    expect(recordName({ amount_cents: 5 })).toBeNull();
  });
});

describe("history diff — technical fields (Z64)", () => {
  it("hides the portal's uid, the details and the expiry of a hold", () => {
    const rows = changes(null, {
      id: "x",
      ical_uid: "abc@airbnb.com",
      ical_details: { phone4: "1234" },
      expires_at: "2026-10-16T12:00:00Z",
      label: "Reserved",
      conflict: true,
    });
    expect(rows.map((r) => r.field)).toEqual(["label", "conflict"]);
  });
});
