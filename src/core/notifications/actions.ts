"use server";

import { getCurrentUser } from "@/core/auth/session";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";
import type { BellData, BellScope, NotificationItem } from "./types";

const SHOWN_DAYS = 90;
const LIMIT = 40;

/** The bell of the signed-in person: client notifications in the administration, platform ones in the control center. */
export async function loadBell(scope: BellScope): Promise<BellData> {
  const user = await getCurrentUser();
  if (!user) return { items: [], unread: 0 };
  const supabase = await createClient();
  const since = new Date(Date.now() - SHOWN_DAYS * 86_400_000).toISOString();
  let query = supabase
    .from("notifications")
    .select("id, kind, data, target, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (scope === "platform") {
    query = query.eq("audience", "platform");
  } else {
    const active = await getActiveMembership();
    if (!active) return { items: [], unread: 0 };
    query = query.eq("audience", "tenant").eq("tenant_id", active.tenantId);
  }
  const { data: rows } = await query;
  const list = rows ?? [];
  const { data: reads } = list.length
    ? await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user.id)
        .in(
          "notification_id",
          list.map((n) => n.id),
        )
    : { data: [] };
  const read = new Set((reads ?? []).map((r) => r.notification_id));
  const items: NotificationItem[] = list.map((n) => ({
    id: n.id,
    kind: n.kind,
    data: (n.data ?? {}) as Record<string, unknown>,
    target: n.target,
    createdAt: n.created_at,
    read: read.has(n.id),
  }));
  return { items, unread: items.filter((i) => !i.read).length };
}

/** Marks notifications as read for the signed-in person only (RLS checks they can see them). */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  const user = await getCurrentUser();
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, LIMIT);
  if (!user || !clean.length) return;
  const supabase = await createClient();
  await supabase.from("notification_reads").upsert(
    clean.map((id) => ({ notification_id: id, user_id: user.id })),
    { onConflict: "notification_id,user_id", ignoreDuplicates: true },
  );
}
