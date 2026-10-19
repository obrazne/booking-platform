import { toCsv } from "@/lib/csv";

type T = (key: string) => string;

export type CsvGuest = {
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  language?: string | null;
  consent: boolean;
  stays: number;
  lastStay: string | null;
  nextStay: string | null;
  spentCents: number;
  source: string;
};

/**
 * Export of Hostia (Z68): "consent" = only guests with the consent with offers, with the date and the source of the
 * consent (for Ecomail / SmartEmailing); "all" = everyone for the own records (with a column whether they consented).
 * Amounts as decimal numbers with a comma (Excel in Slovak).
 */
export function guestsCsv(
  scope: "consent" | "all",
  rows: readonly CsvGuest[],
  consents: ReadonlyMap<string, { at: string | null; source: string }>,
  t: T,
  source: T,
): string {
  const list = scope === "consent" ? rows.filter((r) => r.consent) : rows;
  const base = [t("email"), t("name"), t("phone"), t("country"), t("language")];
  if (scope === "consent") {
    return toCsv(
      [...base, t("consentAt"), t("consentSource")],
      list.map((r) => {
        const c = consents.get(r.email);
        return [
          r.email,
          r.name ?? "",
          r.phone ?? "",
          r.country ?? "",
          r.language ?? "",
          c?.at?.slice(0, 10) ?? "",
          c ? source(c.source) : "",
        ];
      }),
    );
  }
  return toCsv(
    [...base, t("stays"), t("last"), t("next"), t("spent"), t("consent"), t("added")],
    list.map((r) => [
      r.email,
      r.name ?? "",
      r.phone ?? "",
      r.country ?? "",
      r.language ?? "",
      r.stays,
      r.lastStay ?? "",
      r.nextStay ?? "",
      (r.spentCents / 100).toFixed(2).replace(".", ","),
      r.consent ? t("yes") : t("no"),
      r.source === "manual" ? t("yes") : "",
    ]),
  );
}
