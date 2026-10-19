import "server-only";
import { createClient } from "@/lib/supabase/server";
import { changes, recordName, type FieldChange } from "./diff";

export type HistoryParams = {
  from: string | null;
  to: string | null;
  table: string | null;
  actor: string | null;
  /** Who made the change (Z64): people of the client, guests, the system. */
  source: "user" | "guest" | "system" | null;
  /** Show the synchronisation of portal calendars too (hidden by default, Z64). */
  sync: boolean;
  page: number;
};

const PAGE_SIZE = 20;
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
    source:
      sp.source === "user" || sp.source === "guest" || sp.source === "system" ? sp.source : null,
    sync: sp.sync === "1",
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
    source: p.source,
    sync: p.sync ? "1" : null,
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
  /** "Vrátiť túto zmenu" — only changes made by people (Z64). */
  revertable: boolean;
  /** One run of the synchronisation of a portal calendar (Z64). */
  sync: null | {
    channel: string;
    source: string;
    added: number;
    updated: number;
    removed: number;
    conflicts: number;
    events: { op: string; start: string; end: string; label: string | null; before?: string }[];
  };
};

/**
 * History of a client's data for the control center (Z31) — platform admin only (RLS), newest first,
 * with the readable changes of each entry.
 */
/** One page of the history from the database (rule 7), `size` rows (20 / 50 / 100). */
export async function loadHistory(
  tenantId: string,
  p: HistoryParams,
  currency: string,
  size: number = PAGE_SIZE,
) {
  const supabase = await createClient();
  let query = supabase
    .from("record_history")
    .select("id, table_name, op, old_row, new_row, changed_by, source, changed_at", {
      count: "exact",
    })
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .range((p.page - 1) * size, p.page * size - 1);
  if (p.from) query = query.gte("changed_at", `${p.from}T00:00:00`);
  if (p.to) query = query.lte("changed_at", `${p.to}T23:59:59.999`);
  if (p.table) query = query.eq("table_name", p.table);
  if (p.actor) query = query.eq("changed_by", p.actor);
  if (p.source) query = query.eq("source", p.source);
  if (!p.sync) query = query.eq("is_sync", false);
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
      fields: r.table_name === "ical_sync" ? [] : changes(oldRow, newRow, "sk", currency),
      // Records of what happened (synchronisation, exports) are not changes of data — nothing to revert.
      revertable: r.source === "user" && !["ical_sync", "guest_export"].includes(r.table_name),
      sync: r.table_name === "ical_sync" ? syncSummary(newRow) : null,
    };
  });
  const total = count ?? 0;
  return {
    entries,
    total,
    page: p.page,
    pages: Math.max(1, Math.ceil(total / size)),
    tables: [...new Set((tables ?? []).map((r) => r.table_name))].sort(),
    people: actorIds.map((id) => ({ id, name: name.get(id) ?? id })),
  };
}

/** The summary row of one run of a portal calendar (written by ical_apply). */
function syncSummary(row: Record<string, unknown> | null): HistoryEntry["sync"] {
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  const events = Array.isArray(row?.events) ? (row.events as Record<string, unknown>[]) : [];
  return {
    channel: String(row?.channel ?? "iCal"),
    source: String(row?.source ?? "other"),
    added: n(row?.added),
    updated: n(row?.updated),
    removed: n(row?.removed),
    conflicts: n(row?.conflicts),
    events: events.map((e) => ({
      op: String(e.op ?? ""),
      start: String(e.start ?? ""),
      end: String(e.end ?? ""),
      label: typeof e.label === "string" ? e.label : null,
      before:
        typeof e.before_start === "string" && typeof e.before_end === "string"
          ? `${e.before_start}|${e.before_end}`
          : undefined,
    })),
  };
}
