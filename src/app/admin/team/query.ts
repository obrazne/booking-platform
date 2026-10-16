import "server-only";
import { createClient } from "@/lib/supabase/server";
import { likePattern, pageRange, parseListParams, type ListParams } from "@/core/admin/list-params";

export const ROLES = ["owner", "reception", "cleaning"] as const;
export type Role = (typeof ROLES)[number];

export function teamListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListParams {
  return parseListParams(searchParams, {
    sortable: ["created_at", "role"],
    defaultSort: "created_at",
    filters: { role: ROLES },
  });
}

export type TeamRow = {
  id: string;
  role: Role;
  createdAt: string;
  email: string;
  fullName: string | null;
};

/** Team of the tenant; RLS limits it to what the signed-in user may see. */
export async function queryTeam(tenantId: string, p: ListParams, paged = true) {
  const supabase = await createClient();
  let query = supabase
    .from("memberships")
    .select("id, role, created_at, profile:profiles!inner(email, full_name)", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order(p.sort, { ascending: p.dir === "asc" });
  if (p.filters.role) query = query.eq("role", p.filters.role);
  if (p.q) {
    const pattern = likePattern(p.q);
    query = query.or(`email.ilike.${pattern},full_name.ilike.${pattern}`, {
      referencedTable: "profiles",
    });
  }
  if (paged) query = query.range(...pageRange(p));
  const { data, count, error } = await query;
  if (error) throw error;
  const rows: TeamRow[] = (data ?? []).map((r) => ({
    id: r.id,
    role: r.role as Role,
    createdAt: r.created_at,
    email: r.profile.email,
    fullName: r.profile.full_name,
  }));
  return { rows, total: count ?? rows.length };
}
