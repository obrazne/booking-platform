/** Check-in persons: name, nationality and dates stay; the document number, birth date and address are masked. */
export function maskCheckinGuest(row: Record<string, unknown>): Record<string, unknown> {
  const tail = (v: unknown, keep: number) =>
    typeof v === "string" && v ? `${"•".repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}` : v;
  return {
    ...row,
    document_number: tail(row.document_number, 2),
    birth_date:
      typeof row.birth_date === "string" ? `${row.birth_date.slice(0, 4)}-••-••` : row.birth_date,
    address: row.address ? "•••" : row.address,
  };
}
