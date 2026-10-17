"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { markGuestMessagesRead, sendGuestMessage } from "./actions";
import type { GuestMessages } from "./load";

type Item =
  | { kind: "day"; key: string; label: string }
  | { kind: "event"; key: string; label: string }
  | { kind: "new"; key: string; label: string }
  | { kind: "msg"; key: string; mine: boolean; body: string; time: string; status?: string };

/**
 * Conversation of the guest with the owner (Z47, design `SpravyPobyt` / `MobilSpravy`): owner's messages on the left,
 * the guest's on the right in the accent, days as mono separators, the confirmation as a grey pill, "Dnes · nová
 * správa" before what the guest has not read, quick topics, the field and "Odoslať". Automatic messages are from the
 * owner — not marked. Opening it marks the owner's messages as read.
 */
export function Conversation({
  data,
  reservationId,
  token,
  locale,
  full = false,
}: {
  data: GuestMessages;
  reservationId: string;
  token?: string;
  locale: string;
  full?: boolean;
}) {
  const t = useTranslations("modules.messages.guest");
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Where "nová správa" was when the conversation opened (it stays put after reading).
  const [readBefore] = useState(data.guestReadAt);
  const field = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read only when the guest really sees it (on phones the inline conversation is hidden — the own screen opens).
    const el = end.current;
    if (data.unread > 0 && el && el.offsetParent !== null)
      void markGuestMessagesRead(reservationId, token);
  }, [data.unread, reservationId, token]);
  useEffect(() => {
    if (full) end.current?.scrollIntoView({ block: "end" });
  }, [full, data.messages.length]);

  const tz = data.timeZone;
  const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("sv", { timeZone: tz }).format(new Date(iso));
  const today = dayKey(new Date().toISOString());
  const dayLabel = (iso: string) =>
    dayKey(iso) === today
      ? t("today")
      : new Intl.DateTimeFormat(locale, {
          weekday: "long",
          day: "numeric",
          month: "numeric",
          timeZone: tz,
        }).format(new Date(iso));
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(
      new Date(iso),
    );

  const items: Item[] = [];
  const events = data.confirmedAt ? [{ at: data.confirmedAt }] : [];
  const lastMine = [...data.messages].reverse().find((m) => m.mine);
  let lastDay = "";
  let newShown = false;
  const timeline = [
    ...events.map((e) => ({ at: e.at, event: true as const })),
    ...data.messages.map((m) => ({ at: m.createdAt, event: false as const, m })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  for (const x of timeline) {
    const d = dayKey(x.at);
    if (!x.event && !x.m.mine && !newShown && (!readBefore || x.m.createdAt > readBefore)) {
      items.push({ kind: "new", key: `new-${x.m.id}`, label: dayLabel(x.at) });
      newShown = true;
      lastDay = d;
    } else if (d !== lastDay) {
      items.push({ kind: "day", key: `day-${d}`, label: dayLabel(x.at) });
      lastDay = d;
    }
    if (x.event) {
      items.push({
        kind: "event",
        key: `event-${x.at}`,
        label: t("confirmed", {
          date: new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "numeric",
            timeZone: tz,
          }).format(new Date(x.at)),
        }),
      });
    } else {
      items.push({
        kind: "msg",
        key: x.m.id,
        mine: x.m.mine,
        body: x.m.body,
        time: time(x.m.createdAt),
        status:
          lastMine && x.m.id === lastMine.id
            ? data.teamReadAt && data.teamReadAt >= x.m.createdAt
              ? t("read")
              : t("sent")
            : undefined,
      });
    }
  }

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendGuestMessage(reservationId, text, token);
      if (r.ok) {
        setText("");
        router.refresh();
      } else
        setError(
          t(`errors.${r.error === "closed" || r.error === "rate_limited" ? r.error : "generic"}`),
        );
    });

  return (
    <div className={cn("grid min-h-0 gap-0", full && "h-full grid-rows-[minmax(0,1fr)_auto]")}>
      <div
        role="log"
        aria-label={t("log", { name: data.owner.first })}
        className={cn(
          "grid content-start gap-3 overflow-y-auto px-5 py-5",
          full ? "min-h-0" : "max-h-[520px]",
        )}
      >
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5a6672]">
            {t("empty", { name: data.owner.first })}
          </p>
        ) : null}
        {items.map((it) =>
          it.kind === "day" ? (
            <p
              key={it.key}
              className="py-1 text-center font-mono text-[11px] tracking-[0.12em] text-[#6b7480] uppercase"
            >
              {it.label}
            </p>
          ) : it.kind === "new" ? (
            <p
              key={it.key}
              className="text-accent-2 flex items-center gap-3 py-1 font-mono text-[11px] font-medium tracking-[0.12em] uppercase before:h-px before:flex-1 before:bg-current/40 after:h-px after:flex-1 after:bg-current/40"
            >
              {t("newMark", { day: it.label })}
            </p>
          ) : it.kind === "event" ? (
            <p
              key={it.key}
              className="justify-self-center rounded-full bg-[#eef0ec] px-3.5 py-1 text-xs text-[#5a6672]"
            >
              {it.label}
            </p>
          ) : (
            <div
              key={it.key}
              className={cn(
                "grid max-w-[78%] gap-1",
                it.mine ? "justify-items-end justify-self-end" : "justify-self-start",
              )}
            >
              <p
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line",
                  it.mine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "text-ink rounded-bl-md bg-[#f3f4f2]",
                )}
              >
                {it.body}
              </p>
              <span className="text-[11px] text-[#6b7480]">
                {it.time}
                {it.status ? ` · ${it.status}` : ""}
              </span>
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <div className="border-line grid gap-2.5 border-t px-5 py-4">
        {data.closed ? (
          <p className="text-sm text-[#5a6672]">
            {t("closed", { contact: data.owner.phone ?? data.owner.email ?? data.owner.name })}
          </p>
        ) : (
          <>
            {data.topics.length ? (
              <div
                className={cn("flex gap-2", full ? "-mx-5 overflow-x-auto px-5 pb-1" : "flex-wrap")}
              >
                {data.topics.slice(0, 3).map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setText((v) => (v.trim() ? `${v.trimEnd()} ${topic}` : `${topic} `));
                      field.current?.focus();
                    }}
                    className="border-line text-ink min-h-9 shrink-0 rounded-full border bg-white px-3.5 text-[13px] whitespace-nowrap"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2.5">
              <label className="sr-only" htmlFor={`msg-${reservationId}`}>
                {t("field", { name: data.owner.first })}
              </label>
              <textarea
                ref={field}
                id={`msg-${reservationId}`}
                rows={full ? 1 : 2}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("placeholder", { name: data.owner.first })}
                className="border-line text-ink min-h-11 flex-1 resize-none rounded-[22px] border px-4 py-2.5 text-base"
              />
              <button
                type="button"
                onClick={send}
                disabled={pending || !text.trim()}
                aria-label={t("send")}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center justify-center bg-[#2b3036] font-bold text-white disabled:opacity-50",
                  full ? "size-11 rounded-full" : "rounded-full px-5 text-sm",
                )}
              >
                {full ? <ArrowUp className="size-5" /> : t("send")}
              </button>
            </div>
            {!full ? (
              <p className="text-xs text-[#5a6672]">{t("hint", { name: data.owner.first })}</p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-[#a8432f]">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
