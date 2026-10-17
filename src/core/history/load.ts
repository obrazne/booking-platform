import "server-only";
import { createClient } from "@/lib/supabase/server";
import { changes, recordName, type FieldChange } from "./diff";

export type HistoryParams = {
  from: string | null;
  to: string | null;
  table: string | null;
  actor: string | null;
  page: number;
};

const PAGE_SIZE = 50;
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function parseHistoryParams(
  sp: Record<string, string | string[] | undefined>,
): HistoryParams {
  const page = Number(sp.page);
  return {
    from: date(sp.from),
    to: date(sp.to),
    table: typeof sp.table === "string" && /^[a-z_]{1,40}$/.test(sp.table) ? sp.table : null,
    actor: typeof sp.actor === "string" && /^[0-9a-f-]{36}$/.test(sp.actor) ? sp.actor : null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function historyQuery(
  p: HistoryParams,
  extra: Record<string, string | number> = {},
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({
    from: p.from,
    to: p.to,
    table: p.table,
    actor: p.actor,
    ...extra,
  })) {
    if (v !== null && v !== "" && v !== undefined) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type HistoryEntry = {
  id: number;
  table: string;
  op: "insert" | "update" | "delete";
  name: string | null;
  at: string;
  actor: string | null;
  source: "user" | "guest" | "system";
  fields: FieldChange[];
};

/**
 * History of a client's data for the control center (Z31) — platform admin only (RLS), newest first,
 * with the readable changes of each entry.
 */
export async function loadHistory(tenantId: string, p: HistoryParams, currency: string) {
  const supabase = await createClient();
  let query = supabase
    .from("record_history")
    .select("id, table_name, op, old_row, new_row, changed_by, source, changed_at", {
      count: "exact",
    })
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .range((p.page - 1) * PAGE_SIZE, p.page * PAGE_SIZE - 1);
  if (p.from) query = query.gte("changed_at", `${p.from}T00:00:00`);
  if (p.to) query = query.lte("changed_at", `${p.to}T23:59:59.999`);
  if (p.table) query = query.eq("table_name", p.table);
  if (p.actor) query = query.eq("changed_by", p.actor);
  const [{ data, count }, { data: tables }] = await Promise.all([
    query,
    supabase
      .from("record_history")
      .select("table_name, changed_by")
      .eq("tenant_id", tenantId)
      .limit(2000),
  ]);
  const actorIds = [
    ...new Set([...(data ?? []), ...(tables ?? [])].map((r) => r.changed_by).filter(Boolean)),
  ] as string[];
  const { data: people } = actorIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", actorIds)
    : { data: [] };
  const name = new Map((people ?? []).map((x) => [x.id, x.full_name ?? x.email]));
  const entries: HistoryEntry[] = (data ?? []).map((r) => {
    const oldRow = r.old_row as Record<string, unknown> | null;
    const newRow = r.new_row as Record<string, unknown> | null;
    return {
      id: r.id,
      table: r.table_name,
      op: r.op as HistoryEntry["op"],
      name: recordName(newRow ?? oldRow),
      at: r.changed_at,
      actor: r.changed_by ? (name.get(r.changed_by) ?? null) : null,
      source: r.source as HistoryEntry["source"],
      fields: changes(oldRow, newRow, "sk", currency),
    };
  });
  const total = count ?? 0;
  return {
    entries,
    total,
    page: p.page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    tables: [...new Set((tables ?? []).map((r) => r.table_name))].sort(),
    people: actorIds.map((id) => ({ id, name: name.get(id) ?? id })),
  };
}
