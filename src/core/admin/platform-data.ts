import "server-only";
import { createClient } from "@/lib/supabase/server";
import { likePattern } from "./list-params";

/** Test accounts of the automated tests — never shown as a client's contact (v1.1, rule 9). */
export const isTestAccount = (email: string | null | undefined) =>
  Boolean(email && /@booking-platform\.test$/i.test(email));

/** Public address of a client: its domain, never the development `*.localhost` (v1.1, rule 9). */
export function publicDomain(domains: { hostname: string; is_primary: boolean }[]): string | null {
  const pub = domains.filter((d) => !d.hostname.endsWith(".localhost"));
  return (pub.find((d) => d.is_primary) ?? pub[0])?.hostname ?? null;
}

const TENANT_SELECT =
  "id, name, slug, status, created_at, tenant_domains(hostname, is_primary), tenant_modules(module_key, status, trial_ends_at), tenant_themes(primary_color, heading_font, body_font, background_color), memberships(role, profile:profiles(email, full_name))";

type TenantData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  tenant_domains: { hostname: string; is_primary: boolean }[];
  tenant_modules: { module_key: string; status: string; trial_ends_at: string | null }[];
  tenant_themes: {
    primary_color: string;
    heading_font: string;
    body_font: string;
    background_color: string;
  } | null;
  memberships: { role: string; profile: { email: string; full_name: string | null } | null }[];
};

function withPeople(t: TenantData) {
  const people = t.memberships.filter((m) => !isTestAccount(m.profile?.email));
  const owner = people.find((m) => m.role === "owner")?.profile ?? null;
  return { ...t, people, owner, domain: publicDomain(t.tenant_domains) };
}

/** Clients for the control center with modules, theme and people (platform admin, RLS). */
export async function loadTenants() {
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select(TENANT_SELECT).order("name");
  return ((data ?? []) as unknown as TenantData[]).map(withPeople);
}

export const TENANT_STATUSES = ["active", "onboarding", "suspended"] as const;
export const TENANT_SHOW = ["trial_ending", "issues"] as const;
export type TenantListParams = {
  q: string;
  status: (typeof TENANT_STATUSES)[number] | "";
  module: string;
  show: (typeof TENANT_SHOW)[number] | "";
  /** Trials ending up to this moment count as "ending" (14 days ahead). */
  soon: string;
  issueIds: string[];
};

/**
 * One page of the control center's clients (rule 7): search (name, address, domain, owner) and filters (state,
 * module, ending trial, problem) in SQL, the page by `range`, and the counts of the filter pills as head counts —
 * each pill counted with the other filters applied.
 */
export async function queryTenants(
  p: TenantListParams,
  range: { from: number; to: number },
  moduleKeys: readonly string[],
) {
  const supabase = await createClient();
  const like = likePattern(p.q);
  const NONE = "00000000-0000-0000-0000-000000000000";
  const ids = (rows: { tenant_id: string }[] | null) => [
    ...new Set((rows ?? []).map((r) => r.tenant_id)),
  ];
  // Clients matching by a related row (domain, owner) or a module state — small id lists.
  const [domains, owners, moduleRows, trialRows] = await Promise.all([
    p.q
      ? supabase.from("tenant_domains").select("tenant_id").ilike("hostname", like).limit(500)
      : Promise.resolve({ data: [] }),
    p.q
      ? supabase
          .from("memberships")
          .select("tenant_id, profile:profiles!inner(email, full_name)")
          .eq("role", "owner")
          .or(`email.ilike.${like},full_name.ilike.${like}`, { referencedTable: "profiles" })
          .limit(500)
      : Promise.resolve({ data: [] }),
    supabase.from("tenant_modules").select("tenant_id, module_key").neq("status", "off"),
    supabase
      .from("tenant_modules")
      .select("tenant_id")
      .eq("status", "trial")
      .lte("trial_ends_at", p.soon),
  ]);
  const byQ = [...ids(domains.data), ...ids(owners.data as { tenant_id: string }[] | null)];
  const withModule = (key: string) =>
    ids((moduleRows.data ?? []).filter((r) => r.module_key === key));
  const trialIds = ids(trialRows.data);
  const list = (xs: string[]) => `(${(xs.length ? xs : [NONE]).join(",")})`;

  type Skip = "status" | "module" | "show" | null;
  type Filterable<Q> = {
    or(filters: string): Q;
    eq(column: "status", value: string): Q;
    filter(column: "id", operator: "in", value: string): Q;
  };
  const filtered = <Q extends Filterable<Q>>(
    query: Q,
    skip: Skip,
    o: Partial<Pick<TenantListParams, "status" | "module" | "show">> = {},
  ) => {
    const status = skip === "status" ? (o.status ?? "") : p.status;
    const moduleKey = skip === "module" ? (o.module ?? "") : p.module;
    const show = skip === "show" ? (o.show ?? "") : p.show;
    let q = query;
    if (p.q)
      q = q.or(
        [
          `name.ilike.${like}`,
          `slug.ilike.${like}`,
          ...(byQ.length ? [`id.in.${list(byQ)}`] : []),
        ].join(","),
      );
    if (status) q = q.eq("status", status);
    if (moduleKey) q = q.filter("id", "in", list(withModule(moduleKey)));
    if (show === "issues") q = q.filter("id", "in", list(p.issueIds));
    if (show === "trial_ending") q = q.filter("id", "in", list(trialIds));
    return q;
  };
  const head = () => supabase.from("tenants").select("id", { count: "exact", head: true });

  const [page, ...counts] = await Promise.all([
    filtered(supabase.from("tenants").select(TENANT_SELECT, { count: "exact" }), null)
      .order("name")
      .range(range.from, range.to),
    filtered(head(), "status"),
    ...TENANT_STATUSES.map((status) => filtered(head(), "status", { status })),
    ...TENANT_SHOW.map((show) => filtered(head(), "show", { show })),
    ...moduleKeys.map((module) => filtered(head(), "module", { module })),
  ]);
  const n = (i: number) => counts[i]?.count ?? 0;
  return {
    rows: ((page.data ?? []) as unknown as TenantData[]).map(withPeople),
    total: page.count ?? 0,
    counts: {
      all: n(0),
      status: Object.fromEntries(TENANT_STATUSES.map((s, i) => [s, n(1 + i)])),
      show: Object.fromEntries(TENANT_SHOW.map((s, i) => [s, n(1 + TENANT_STATUSES.length + i)])),
      module: Object.fromEntries(
        moduleKeys.map((k, i) => [k, n(1 + TENANT_STATUSES.length + TENANT_SHOW.length + i)]),
      ),
    },
  };
}

export type ControlTenant = Awaited<ReturnType<typeof loadTenants>>[number];
