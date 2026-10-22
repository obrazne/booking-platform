import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { formatDate } from "@/core/format/format";
import { stayTodos } from "@/core/guest/todos";
import { listStays, requireGuest, type Stay } from "@/core/guest/zone";
import type { GuestTodo } from "@/core/modules/types";
import { diffDays, todayIso } from "@/core/pricing/dates";
import { Container } from "@/core/sections/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Môj účet" };

const DOT: Record<GuestTodo["tone"], string> = { warn: "bg-[#c07a3e]", info: "bg-[#c9cdd2]" };

/**
 * Pobyty — overview of the guest account (v2.4 `UcetPrehlad`, Z43): greeting, the nearest stay as a big clickable
 * card with "what to do" (core + modules), further stays smaller, past stays as rows ("Ohodnoťte pobyt"), and the
 * owner's contact. Details of the guest are on "Moje údaje".
 */
export default async function GuestZonePage() {
  const { tenant, supabase, guest } = await requireGuest();
  const [stays, t, ts, tb, locale, { data: contact }] = await Promise.all([
    listStays(),
    getTranslations("guest.account"),
    getTranslations("guest.reservation.status"),
    getTranslations("guest.booking"),
    getLocale(),
    supabase.rpc("tenant_public_contact", { p_tenant_id: tenant.id }).maybeSingle(),
  ]);
  const today = todayIso();
  const active = stays
    .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const [next, ...upcoming] = active;
  const past = stays.filter((s) => !active.includes(s));
  const todos = new Map(
    await Promise.all(stays.map(async (s) => [s.id, await stayTodos(s.id)] as const)),
  );
  const firstName = guest.name?.split(" ")[0] || "none";
  const range = (s: Stay) =>
    `${formatDate(s.checkIn, locale, "short")} – ${formatDate(s.checkOut, locale)}`;
  const facts = (s: Stay) =>
    [
      tb("nights", { count: diffDays(s.checkIn, s.checkOut) }),
      t("guests", { count: s.adults + s.children + s.infants }),
      s.number,
    ].join(" · ");
  const ownerName = contact?.contact_name?.trim() || null;
  const initials = (ownerName ?? tenant.name)
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const statusPill = (s: Stay) => (
    <span
      className={cn(
        "rounded-full px-2.5 py-[3px] text-xs font-medium",
        s.status === "pending_payment"
          ? "bg-[#f6ecdf] text-[#8a4a22]"
          : s.status === "cancelled"
            ? "bg-[#fbeceb] text-[#a8432f]"
            : s.status === "completed"
              ? "bg-[#eceae4] text-[#5a6672]"
              : "text-primary bg-[#e6efeb]",
      )}
    >
      {ts(s.status as "confirmed")}
    </span>
  );
  const todoList = (list: GuestTodo[]) =>
    list.length ? (
      <ul className="grid gap-2 pt-1">
        {list.map((x) => (
          <li
            key={x.key}
            className={cn(
              "inline-flex items-center gap-2.5 text-sm",
              x.tone === "warn" ? "text-[#8a4a1c]" : "text-[#3b3d42]",
            )}
          >
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[x.tone])} />
            {x.text}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <Container className="grid items-start gap-12 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 gap-9">
        <h1 className="font-heading text-ink text-[32px] leading-[1.08] font-extrabold tracking-tight sm:text-[40px]">
          {t("hello", { name: firstName })}{" "}
          <span className="text-[#8b929b]">{next ? t("helloNext") : t("helloBack")}</span>
        </h1>
        {stays.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}

        {next ? (
          <section className="grid gap-3">
            <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#5a6672] uppercase">
              {t("nextIn", { count: Math.max(0, diffDays(today, next.checkIn)) })}
            </h2>
            <Link
              href={`/ucet/pobyt/${next.id}`}
              className="guest-card grid overflow-hidden rounded-xl transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(17,33,47,0.35)] sm:grid-cols-[300px_minmax(0,1fr)]"
            >
              <span className="relative min-h-[180px] bg-[#d9dcd8] sm:min-h-[230px]">
                {next.property?.photo ? (
                  <Image
                    src={next.property.photo}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 300px, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="grid content-start gap-3.5 px-[26px] py-6">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-ink text-[22px] font-extrabold tracking-tight">
                    {range(next)}
                  </span>
                  {statusPill(next)}
                </span>
                <span className="text-[15px] text-[#5a6672]">
                  {next.property?.name ? `${next.property.name} · ` : ""}
                  {facts(next)}
                </span>
                {todoList(todos.get(next.id) ?? [])}
                <span className="text-primary text-[15px] font-bold">{t("openStay")} →</span>
              </span>
            </Link>
          </section>
        ) : null}

        {upcoming.length ? (
          <section className="grid gap-3">
            <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#5a6672] uppercase">
              {t("upcoming")}
            </h2>
            {upcoming.map((s) => (
              <Link
                key={s.id}
                href={`/ucet/pobyt/${s.id}`}
                className="guest-card grid gap-2 rounded-xl px-[22px] py-[18px] transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(17,33,47,0.35)]"
              >
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-ink text-lg font-extrabold">{range(s)}</span>
                  {statusPill(s)}
                </span>
                <span className="text-sm text-[#5a6672]">{facts(s)}</span>
                {todoList(todos.get(s.id) ?? [])}
              </Link>
            ))}
          </section>
        ) : null}

        {past.length ? (
          <section className="grid gap-2.5">
            <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-[#5a6672] uppercase">
              {t("past")}
            </h2>
            <ul className="border-line border-t">
              {past.map((s) => {
                const review = (todos.get(s.id) ?? []).some((x) => x.key === "review");
                return (
                  <li key={s.id}>
                    <Link
                      href={`/ucet/pobyt/${s.id}${review ? "#hodnotenie" : ""}`}
                      className="border-line flex items-center gap-3.5 border-b px-1 py-4"
                    >
                      <span className="grid flex-1 gap-0.5">
                        <span className="text-ink text-base font-bold">{range(s)}</span>
                        <span className="text-[13px] text-[#5a6672]">
                          {tb("nights", { count: diffDays(s.checkIn, s.checkOut) })} · {s.number} ·{" "}
                          {ts(s.status as "confirmed")}
                        </span>
                      </span>
                      {review ? (
                        <span className="rounded-full bg-[#fbf1e6] px-3 py-1 text-xs font-medium text-[#8a4a1c]">
                          {t("reviewStay")}
                        </span>
                      ) : null}
                      <span aria-hidden className="text-sm text-[#5a6672]">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        <Link href="/" className="text-ink justify-self-start text-sm font-medium underline">
          {t("bookAnother")}
        </Link>
      </div>

      {contact?.whatsapp_phone || contact?.contact_phone ? (
        <aside className="guest-card grid gap-3 rounded-[10px] px-5 py-[18px]" data-guest-sticky>
          <h2 className="text-ink text-[15px] font-bold">{t("questions")}</h2>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex size-[38px] items-center justify-center rounded-full bg-[#e9e5db] text-[13px] font-bold text-[#5a6672]"
            >
              {initials}
            </span>
            <span className="text-sm">
              {ownerName ? t("answers", { name: ownerName }) : tenant.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {contact.whatsapp_phone ? (
              <a
                href={`https://wa.me/${contact.whatsapp_phone.replace(/\D/g, "")}`}
                className="border-line text-ink inline-flex min-h-[38px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[13px] font-medium"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            ) : null}
            {contact.contact_phone ? (
              <a
                href={`tel:${contact.contact_phone.replace(/\s/g, "")}`}
                className="border-line text-ink inline-flex min-h-[38px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[13px] font-medium"
              >
                <Phone className="size-4" /> {t("call")}
              </a>
            ) : null}
          </div>
        </aside>
      ) : null}
    </Container>
  );
}
