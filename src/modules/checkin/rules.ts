/**
 * Rules of a country for online check-in (A6, Z36) — the same package as `checkin_rules` in the database, which
 * enforces them. Slovakia: book of guests for every person (name, document, permanent address), foreigners also
 * nationality and date of birth; report of a foreigner to the police within 5 days (act 404/2011); the form is kept
 * 2 years. FIELDS AND PERIODS MUST BE VERIFIED BEFORE PRODUCTION.
 */
export type CheckinField =
  | "first_name"
  | "last_name"
  | "document_type"
  | "document_number"
  | "address"
  | "nationality"
  | "birth_date";

export type CountryRules = {
  country: string;
  documentTypes: readonly string[];
  required: readonly CheckinField[];
  requiredForeigner: readonly CheckinField[];
  foreignerReportDays: number;
  retentionDays: number;
  sensitive: readonly CheckinField[];
};

export const COUNTRY_RULES: Record<string, CountryRules> = {
  SK: {
    country: "SK",
    documentTypes: ["id_card", "passport"],
    required: ["first_name", "last_name", "document_type", "document_number", "address"],
    requiredForeigner: ["nationality", "birth_date"],
    foreignerReportDays: 5,
    retentionDays: 730,
    sensitive: ["document_number", "birth_date"],
  },
};

export function rulesFor(country: string | null | undefined): CountryRules {
  return COUNTRY_RULES[(country ?? "SK").toUpperCase()] ?? COUNTRY_RULES.SK!;
}

export type CheckinPerson = Partial<Record<CheckinField, string | null>> & { is_citizen: boolean };

/** Fields a person still misses by the rules (citizens of the country vs foreigners). */
export function missingFields(person: CheckinPerson, rules: CountryRules): CheckinField[] {
  const fields = person.is_citizen
    ? rules.required
    : [...rules.required, ...rules.requiredForeigner];
  return fields.filter((f) => !String(person[f] ?? "").trim());
}

/** Last day to report a foreigner (arrival + the days of the rules). */
export function reportDeadline(checkIn: string, rules: CountryRules): string {
  const d = new Date(`${checkIn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + rules.foreignerReportDays);
  return d.toISOString().slice(0, 10);
}

/** Age on a day (whole years). */
export function ageOn(birthDate: string, day: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/**
 * Tax for accommodation of a stay (act 582/2004, rate and exemptions by the municipality): rate per person and night.
 * With a completed check-in by the persons' ages on arrival; otherwise by the reservation (adults pay, children not —
 * the usual exemption under 18).
 */
export function cityTax(input: {
  nights: number;
  checkIn: string;
  rateCents: number;
  exemptUnder: number;
  persons?: { birthDate: string | null }[];
  adults: number;
}): { paying: number; exempt: number; amountCents: number } {
  let paying = input.adults;
  let exempt = 0;
  if (input.persons && input.persons.length) {
    paying = 0;
    for (const p of input.persons) {
      if (p.birthDate && ageOn(p.birthDate, input.checkIn) < input.exemptUnder) exempt++;
      else paying++;
    }
  }
  return { paying, exempt, amountCents: paying * input.nights * input.rateCents };
}
