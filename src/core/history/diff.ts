/**
 * Readable "before → after" of a history entry (Z31): only fields that changed, without bookkeeping columns,
 * values in words (localized texts, money, yes/no). Field names are translated by the caller.
 */

const HIDDEN = new Set([
  "id",
  "tenant_id",
  "created_at",
  "updated_at",
  "created_by",
  "last_sync_at",
  "last_status",
  "last_error",
  "access_token_hash",
  "access_token_enc",
  // Z64: technical columns nobody reads (ids of the portal, expiry of a hold, details of the portal).
  "ical_uid",
  "expires_at",
  "ical_details",
  "is_sync",
  "storage_path",
  "dedupe_key",
]);

const MONTH_DAY = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return { y: y!, m: m!, d: day! };
};

/** "16.–20. 10. 2026", "30. 10.–2. 11. 2026", "30. 12. 2026–2. 1. 2027" — a stay from the first night to departure. */
export function formatRange(from: string, to: string): string {
  const a = MONTH_DAY(from);
  const b = MONTH_DAY(to);
  if (a.y !== b.y) return `${a.d}. ${a.m}. ${a.y}–${b.d}. ${b.m}. ${b.y}`;
  if (a.m !== b.m) return `${a.d}. ${a.m}.–${b.d}. ${b.m}. ${b.y}`;
  return `${a.d}.–${b.d}. ${b.m}. ${b.y}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

export type FieldChange = { field: string; before: string; after: string };

type Row = Record<string, unknown> | null;

export function formatValue(key: string, value: unknown, locale = "sk", currency = "EUR"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "áno" : "nie";
  if (key.endsWith("_cents") && typeof value === "number") {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value / 100);
  }
  if (key.endsWith("_bp") && typeof value === "number") return `${value / 100} %`;
  if (typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    if (typeof o[locale] === "string") return truncate(o[locale] as string);
    if (typeof o.sk === "string") return truncate(o.sk);
    return truncate(JSON.stringify(value));
  }
  if (Array.isArray(value))
    return truncate(value.map((v) => formatValue(key, v, locale, currency)).join(", "));
  if (typeof value === "string" && /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.test(value)) {
    const [, a, b] = /^\[(.+),(.+)\)$/.exec(value)!;
    return formatRange(a!, b!);
  }
  if (typeof value === "string" && DATE.test(value)) {
    const v = MONTH_DAY(value);
    return `${v.d}. ${v.m}. ${v.y}`;
  }
  if (typeof value === "string" && TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))) {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Europe/Bratislava",
    }).format(new Date(value));
  }
  return truncate(String(value));
}

function truncate(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Changed fields of an update; for an insert or delete the main fields of the record. */
export function changes(oldRow: Row, newRow: Row, locale = "sk", currency = "EUR"): FieldChange[] {
  const keys = new Set([...Object.keys(oldRow ?? {}), ...Object.keys(newRow ?? {})]);
  const out: FieldChange[] = [];
  for (const key of keys) {
    if (HIDDEN.has(key) || key.endsWith("_id")) continue;
    const before = oldRow?.[key];
    const after = newRow?.[key];
    if (oldRow && newRow && same(before, after)) continue;
    if ((!oldRow || !newRow) && (before ?? after) === null) continue;
    out.push({
      field: key,
      before: oldRow ? formatValue(key, before, locale, currency) : "—",
      after: newRow ? formatValue(key, after, locale, currency) : "—",
    });
  }
  return out;
}

/** A short name of the record for the list (its name, label or title). */
export function recordName(row: Row, locale = "sk"): string | null {
  if (!row) return null;
  for (const key of [
    "name",
    "title",
    "label",
    "guest_name",
    "number",
    "alt",
    "hostname",
    "module_key",
  ]) {
    const v = row[key];
    if (v !== null && v !== undefined && v !== "") return formatValue(key, v, locale);
  }
  return null;
}
