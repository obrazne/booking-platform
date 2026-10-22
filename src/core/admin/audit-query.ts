import "server-only";
import { getTranslations } from "next-intl/server";
import { auditLabel } from "@/core/admin/audit-label";
import { likePattern } from "@/core/admin/list-params";
import { listModules } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";

/** Audit categories of the control center (v1.2) — which actions each one covers. */
export const AUDIT_CATEGORIES = {
  signin: { exact: ["auth.signed_in"], prefix: [] },
  admin: { exact: ["admin.entered"], prefix: [] },
  modules: { exact: ["module.changed"], prefix: [] },
  team: { exact: [], prefix: ["membership."] },
  settings: { exact: [], prefix: ["settings.", "theme.", "property."] },
  clients: { exact: [], prefix: ["tenant."] },
} as const;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

export type AuditParams = {
  from: string | null;
  to: string | null;
  category: AuditCategory | null;
  tenant: string | null;
  actor: string | null;
  q: string;
  page: number;
};

const PAGE_SIZE = 50;
const MAX_ROWS = 2000;
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) ? v : null);

export function parseAuditParams(sp: Record<string, string | string[] | undefined>): AuditParams {
  const category =
    typeof sp.category === "string" && sp.category in AUDIT_CATEGORIES ? sp.category : null;
  const page = Number(sp.page);
  return {
    from: date(sp.from),
    to: date(sp.to),
    category: category as AuditCategory | null,
    tenant: uuid(sp.tenant),
    actor: uuid(sp.actor),
    q: typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Query string of the filters (pagination and CSV keep them). */
export function auditQuery(p: AuditParams, extra: Record<string, string | number> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({
    from: p.from,
    to: p.to,
    category: p.category,
    tenant: p.tenant,
    actor: p.actor,
    q: p.q,
    ...extra,
  })) {
    if (v !== null && v !== "" && v !== undefined) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type AuditRow = {
  id: number;
  at: string;
  tenantId: string | null;
  tenantName: string | null;
  actorId: string | null;
  actor: string | null;
  label: string;
};

const KNOWN_ACTIONS = [
  "tenant.created",
  "tenant.status_changed",
  "module.changed",
  "membership.created",
  "admin.entered",
  "tenant.exported",
  "auth.signed_in",
  "license.saved",
  "license.state_changed",
] as const;

/**
 * Actions whose human text contains the searched words (rule 9 — people search what they read, e.g. "prihlásenie",
 * not "auth.signed_in"). Every variant of each label is tried; "Iná zmena" matches all other actions.
 */
function actionsMatching(
  label: (entry: Parameters<typeof auditLabel>[1]) => string,
  needle: string,
): { actions: string[]; other: boolean } {
  const has = (text: string) => text.toLocaleLowerCase("sk").includes(needle);
  const variants = (action: string) => {
    const base = { action, entity: "", entity_id: null as string | null };
    if (action === "module.changed")
      return listModules().flatMap((m) =>
        ["trial", "active", "off"].map((status) => ({
          ...base,
          entity_id: m.key,
          data: { after: { status } },
        })),
      );
    if (action === "tenant.status_changed")
      return ["onboarding", "active", "suspended"].map((status) => ({ ...base, data: { status } }));
    if (action === "license.state_changed")
      return ["active", "overdue", "suspended"].map((state) => ({
        ...base,
        data: { after: state },
      }));
    if (action === "auth.signed_in")
      return ["password", "link"].map((method) => ({ ...base, data: { method } }));
    return [{ ...base, data: {} }];
  };
  return {
    actions: KNOWN_ACTIONS.filter((a) => variants(a).some((v) => has(label(v)))),
    other: has(label({ action: "-", entity: "", entity_id: null, data: {} })),
  };
}

/**
 * Audit entries matching the filters, newest first, with the human text of each (rule 9 — never raw action codes).
 * Platform admin sees all, an owner only their client (RLS). Paged by the database (rule 7): one page and the count;
 * the search goes through the client, the person, the action and the human text — all in SQL.
 * `size: "all"` is the CSV export (everything matching, at most MAX_ROWS).
 */
export async function loadAudit(p: AuditParams, size: number | "all" = PAGE_SIZE) {
  const [ta, tAll] = await Promise.all([getTranslations("adminV1.audit"), getTranslations()]);
  const supabase = await createClient();
  const moduleName = (key: string) => {
    const m = listModules().find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };
  const label = (entry: Parameters<typeof auditLabel>[1]) =>
    auditLabel(ta as unknown as Parameters<typeof auditLabel>[0], entry, moduleName);

  let query = supabase
    .from("audit_log_search")
    .select(
      "id, tenant_id, actor_id, action, entity, entity_id, data, created_at, tenant_name, actor_name, actor_email",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (p.from) query = query.gte("created_at", `${p.from}T00:00:00`);
  if (p.to) query = query.lte("created_at", `${p.to}T23:59:59.999`);
  if (p.tenant) query = query.eq("tenant_id", p.tenant);
  if (p.actor) query = query.eq("actor_id", p.actor);
  if (p.category) {
    const c = AUDIT_CATEGORIES[p.category];
    const parts = [
      ...c.exact.map((a) => `action.eq.${a}`),
      ...c.prefix.map((a) => `action.like.${a}%`),
    ];
    query = query.or(parts.join(","));
  }
  if (p.q) {
    const needle = p.q.toLocaleLowerCase("sk");
    const { actions, other } = actionsMatching(label, needle);
    const parts = [`search.ilike.${likePattern(needle)}`];
    if (actions.length) parts.push(`action.in.(${actions.join(",")})`);
    if (other) parts.push(`action.not.in.(${KNOWN_ACTIONS.join(",")})`);
    query = query.or(parts.join(","));
  }
  const page = size === "all" ? 1 : p.page;
  query = size === "all" ? query.limit(MAX_ROWS) : query.range((page - 1) * size, page * size - 1);
  const { data, count } = await query;
  const rows: AuditRow[] = (data ?? []).map((a) => ({
    id: a.id!,
    at: a.created_at!,
    tenantId: a.tenant_id,
    tenantName: a.tenant_name,
    actorId: a.actor_id,
    actor: a.actor_name ?? a.actor_email ?? null,
    label: label({
      action: a.action!,
      entity: a.entity ?? "",
      entity_id: a.entity_id,
      data: a.data,
    }),
  }));
  const total = count ?? rows.length;
  return {
    rows,
    total,
    page,
    pageSize: size === "all" ? total : size,
  };
}

/** People who appear in the audit (filter "Osoba"). */
export async function auditPeople(tenantId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("actor_id, actor:profiles(email, full_name)")
    .not("actor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data } = await query;
  const people = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.actor_id && !people.has(r.actor_id))
      people.set(r.actor_id, r.actor?.full_name ?? r.actor?.email ?? r.actor_id);
  }
  return [...people]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "sk"));
}
