/** Translatable content stored as {"sk": "...", "en": "..."} (A6). */
export type LocalizedText = Record<string, string>;

export function asLocalized(value: unknown): LocalizedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    ),
  );
}

/** Text in the requested language, falling back to the given languages and then to any non-empty value. */
export function tr(value: unknown, locale: string, fallbacks: readonly string[] = ["sk"]): string {
  const map = asLocalized(value);
  for (const l of [locale, ...fallbacks]) {
    const v = map[l]?.trim();
    if (v) return v;
  }
  return Object.values(map).find((v) => v.trim()) ?? "";
}

/** Reads `<name>.<locale>` fields of a form into a localized map (empty values dropped). */
export function localizedFromForm(
  form: FormData,
  name: string,
  locales: readonly string[],
): LocalizedText {
  const out: LocalizedText = {};
  for (const l of locales) {
    const v = form.get(`${name}.${l}`);
    if (typeof v === "string" && v.trim()) out[l] = v.trim();
  }
  return out;
}
