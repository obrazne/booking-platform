/**
 * Rows as CSV (Z52 — export of a client's data): columns of all rows, `;` as in Slovak Excel, quotes when needed,
 * objects as JSON, a BOM so Excel reads UTF-8.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [columns.join(";"), ...rows.map((r) => columns.map((c) => cell(r[c])).join(";"))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
