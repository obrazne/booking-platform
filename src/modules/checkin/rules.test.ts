import { describe, expect, it } from "vitest";
import { ageOn, cityTax, missingFields, reportDeadline, rulesFor } from "./rules";

const sk = rulesFor("sk");

describe("check-in rules (SK)", () => {
  it("asks foreigners for nationality and date of birth", () => {
    const base = {
      first_name: "John",
      last_name: "Smith",
      document_type: "passport",
      document_number: "123456789",
      address: "1 High St",
    };
    expect(missingFields({ ...base, is_citizen: true }, sk)).toEqual([]);
    expect(missingFields({ ...base, is_citizen: false }, sk)).toEqual([
      "nationality",
      "birth_date",
    ]);
    expect(missingFields({ is_citizen: true, first_name: " " }, sk)).toContain("first_name");
  });

  it("reports a foreigner within 5 days", () => {
    expect(reportDeadline("2026-12-29", sk)).toBe("2027-01-03");
  });

  it("counts age on the day of arrival", () => {
    expect(ageOn("2008-12-24", "2026-12-23")).toBe(17);
    expect(ageOn("2008-12-24", "2026-12-24")).toBe(18);
  });

  it("computes the tax for accommodation", () => {
    expect(
      cityTax({ nights: 3, checkIn: "2026-12-24", rateCents: 150, exemptUnder: 18, adults: 2 }),
    ).toEqual({ paying: 2, exempt: 0, amountCents: 900 });
    expect(
      cityTax({
        nights: 3,
        checkIn: "2026-12-24",
        rateCents: 150,
        exemptUnder: 18,
        adults: 2,
        persons: [{ birthDate: "1980-01-01" }, { birthDate: "2015-05-05" }, { birthDate: null }],
      }),
    ).toEqual({ paying: 2, exempt: 1, amountCents: 900 });
  });

  it("falls back to the Slovak package", () => {
    expect(rulesFor("XX").country).toBe("SK");
  });
});
