"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { likePattern } from "@/core/admin/list-params";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDate } from "@/core/format/format";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";

export type RecordHit = { id: string; title: string; where: string; href: string };

const range = (from: string, to: string, locale: string) =>
  `${formatDate(from, locale, "short")} – ${formatDate(to, locale, "short")}`;

/**
 * Search of the top bar (Z67) — group "Rezervácie a hostia": reservations (number, guest, e-mail), guests and notes
 * of the team of the active client. The database rules (RLS) decide what the person may see; a few rows only.
 */
export async function searchRecords(query: string): Promise<RecordHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const active = await getActiveMembership();
  if (!active) return [];
  const [supabase, locale, t] = await Promise.all([
    createClient(),
    getLocale(),
    getTranslations("search"),
  ]);
  const pattern = likePattern(q);
  const ITEMS = "items:reservation_items(check_in, check_out)";
  const [reservations, guests, notes] = await Promise.all([
    supabase
      .from("reservations")
      .select(`id, number, guest_name, ${ITEMS}`)
      .eq("tenant_id", active.tenantId)
      .or(`number.ilike.${pattern},guest_name.ilike.${pattern},guest_email.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("guests")
      .select("id, name, email")
      .eq("tenant_id", active.tenantId)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("reservation_notes")
      .select(`id, body, reservation:reservations!inner(id, number, guest_name, ${ITEMS})`)
      .eq("tenant_id", active.tenantId)
      .ilike("body", pattern)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const dates = (items: { check_in: string; check_out: string }[] | null) => {
    const sorted = [...(items ?? [])].sort((a, b) => a.check_in.localeCompare(b.check_in));
    return sorted.length ? range(sorted[0]!.check_in, sorted.at(-1)!.check_out, locale) : "";
  };
  const hits: RecordHit[] = [];
  for (const r of reservations.data ?? []) {
    hits.push({
      id: `r:${r.id}`,
      title: r.guest_name,
      where: t("reservationRow", { number: r.number, dates: dates(r.items) }),
      href: `/admin/reservations?panel=reservation:${r.id}`,
    });
  }
  for (const g of guests.data ?? []) {
    hits.push({
      id: `g:${g.id}`,
      title: g.name || g.email,
      where: t("guestRow", { email: g.email }),
      // The guest card comes with Z68; until then the reservations of the guest.
      href: `/admin/reservations?q=${encodeURIComponent(g.email)}`,
    });
  }
  for (const n of notes.data ?? []) {
    const r = n.reservation;
    hits.push({
      id: `n:${n.id}`,
      title: n.body.length > 80 ? `${n.body.slice(0, 80)}…` : n.body,
      where: `${t("noteRow", { number: r.number, guest: r.guest_name })} · ${dates(r.items)}`,
      href: `/admin/reservations?panel=reservation:${r.id}`,
    });
  }
  return hits;
}

/** Control center: clients by name or address (Z67). */
export async function searchClients(query: string): Promise<RecordHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2 || !(await isPlatformAdmin())) return [];
  const [supabase, t] = await Promise.all([createClient(), getTranslations("search")]);
  const pattern = likePattern(q);
  const { data } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .order("name")
    .limit(8);
  return (data ?? []).map((x) => ({
    id: `t:${x.id}`,
    title: x.name,
    where: t("clientRow", { slug: x.slug }),
    href: `/platform/tenants/${x.id}`,
  }));
}
