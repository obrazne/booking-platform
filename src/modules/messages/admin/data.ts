import "server-only";
import { tr } from "@/core/i18n/localized";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MessageAnchor } from "../rules";

export type ConversationMessage = {
  id: string;
  sender: "guest" | "staff" | "auto";
  body: string;
  createdAt: string;
  author: string | null;
  rule: { name: string; anchor: MessageAnchor; offsetDays: number } | null;
  readByGuest: boolean;
};

export type ScheduledMessage = {
  ruleId: string;
  name: string;
  anchor: MessageAnchor;
  offsetDays: number;
  sendAt: string;
  body: string;
  skipped: boolean;
  changed: boolean;
};

/**
 * One conversation for the team (Z46, RLS): messages with their authors and rules, what is scheduled (also left
 * out), quick replies. Null for a portal stay (no guest here) or a reservation of another client.
 */
export async function loadConversation(reservationId: string, locale: string) {
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("reservations")
    .select("id, tenant_id, guest_name, source, status, locale")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r || r.source === "booking" || r.source === "airbnb") return null;
  const [
    { data: messages },
    { data: thread },
    { data: scheduled },
    { data: rules },
    { data: quick },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender, body, created_at, author_id, rule_id")
      .eq("reservation_id", reservationId)
      .order("created_at"),
    supabase
      .from("message_threads")
      .select("team_read_at, guest_read_at")
      .eq("reservation_id", reservationId)
      .maybeSingle(),
    supabase.rpc("scheduled_messages", { p_reservation_id: reservationId }),
    supabase
      .from("message_rules")
      .select("id, name, anchor, offset_days")
      .eq("tenant_id", r.tenant_id),
    supabase
      .from("quick_replies")
      .select("id, title, body")
      .eq("tenant_id", r.tenant_id)
      .order("sort"),
  ]);
  // Names of the team members who wrote (profiles of other members through the server).
  const authorIds = [
    ...new Set((messages ?? []).map((m) => m.author_id).filter(Boolean)),
  ] as string[];
  const { data: authors } = authorIds.length
    ? await createAdminClient().from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const ruleOf = (id: string | null) => {
    const rule = (rules ?? []).find((x) => x.id === id);
    return rule
      ? {
          name: tr(rule.name, locale),
          anchor: rule.anchor as MessageAnchor,
          offsetDays: rule.offset_days,
        }
      : null;
  };
  const guestRead = thread?.guest_read_at ?? null;
  return {
    reservation: { id: r.id, guestName: r.guest_name, status: r.status },
    teamReadAt: thread?.team_read_at ?? null,
    messages: (messages ?? []).map((m): ConversationMessage => ({
      id: m.id,
      sender: m.sender as ConversationMessage["sender"],
      body: m.body,
      createdAt: m.created_at,
      author: (authors ?? []).find((a) => a.id === m.author_id)?.full_name ?? null,
      rule: ruleOf(m.rule_id),
      readByGuest: Boolean(guestRead && guestRead >= m.created_at),
    })),
    scheduled: (scheduled ?? []).map((s): ScheduledMessage => ({
      ruleId: s.rule_id,
      name: tr(s.rule_name, locale),
      anchor: (ruleOf(s.rule_id)?.anchor ?? "check_in") as MessageAnchor,
      offsetDays: ruleOf(s.rule_id)?.offsetDays ?? 0,
      sendAt: s.send_at,
      body: s.body,
      skipped: s.skipped,
      changed: s.changed,
    })),
    quickReplies: quick ?? [],
  };
}

export type Conversation = NonNullable<Awaited<ReturnType<typeof loadConversation>>>;

/** Messages of the guest the team has not read yet (the count on the tab). */
export function unreadCount(c: Conversation): number {
  return c.messages.filter(
    (m) => m.sender === "guest" && (!c.teamReadAt || m.createdAt > c.teamReadAt),
  ).length;
}

export type InboxFilter = "all" | "waiting" | "upcoming" | "past";

/**
 * One page of the inbox (database `message_inbox`, rule 7: range + count) and the counts of the filters
 * (`message_inbox_counts`) — nothing is loaded only to be counted.
 */
export async function loadInbox(
  tenantId: string,
  filter: InboxFilter,
  search: string,
  range: { from: number; to: number } = { from: 0, to: 19 },
) {
  const supabase = await createClient();
  const [{ data: rows, count }, { data: c }] = await Promise.all([
    supabase
      .rpc(
        "message_inbox",
        { p_tenant_id: tenantId, p_filter: filter, p_search: search || undefined },
        { count: "exact" },
      )
      .range(range.from, range.to),
    supabase.rpc("message_inbox_counts", { p_tenant_id: tenantId }).single(),
  ]);
  return {
    rows: rows ?? [],
    total: count ?? 0,
    counts: {
      all: Number(c?.all_count ?? 0),
      waiting: Number(c?.waiting ?? 0),
      upcoming: Number(c?.upcoming ?? 0),
      past: Number(c?.past ?? 0),
    },
  };
}

/**
 * Whom "Nová správa" can write to (Martin 17. 10.): direct reservations not cancelled, from 60 days back, the nearest
 * arrival first; marks those with a conversation already.
 */
export async function newMessageTargets(tenantId: string) {
  const supabase = await createClient();
  const from = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rows }, { data: threads }] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, number, guest_name, items:reservation_items(check_in, check_out)")
      .eq("tenant_id", tenantId)
      .not("source", "in", "(booking,airbnb)")
      .in("status", ["pending_payment", "confirmed", "in_progress", "completed"])
      .limit(1000),
    supabase.rpc("message_inbox", { p_tenant_id: tenantId, p_filter: "all" }),
  ]);
  const withThread = new Set((threads ?? []).map((x) => x.reservation_id));
  return (rows ?? [])
    .map((r) => ({
      id: r.id,
      number: r.number,
      guestName: r.guest_name,
      checkIn: r.items.reduce((m, i) => (!m || i.check_in < m ? i.check_in : m), ""),
      checkOut: r.items.reduce((m, i) => (i.check_out > m ? i.check_out : m), ""),
      hasThread: withThread.has(r.id),
    }))
    .filter((r) => r.checkIn && r.checkOut >= from)
    .sort((a, b) => {
      // Stays now and coming first (nearest arrival), then the past ones (latest departure).
      const pa = a.checkOut < today;
      const pb = b.checkOut < today;
      if (pa !== pb) return pa ? 1 : -1;
      return pa ? b.checkOut.localeCompare(a.checkOut) : a.checkIn.localeCompare(b.checkIn);
    });
}
