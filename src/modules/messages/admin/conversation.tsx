"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { markConversationRead, sendStaffMessage, setScheduledOverride } from "./actions";
import type { ConversationMessage, ScheduledMessage } from "./data";
import { ruleWhen } from "./when";

type Props = {
  reservationId: string;
  guestName: string;
  timeZone: string;
  locale: string;
  /** Today and yesterday in the client's time zone (from the server — the same on the server and the client). */
  today: string;
  yesterday: string;
  messages: ConversationMessage[];
  scheduled: ScheduledMessage[];
  quickReplies: { id: string; title: string; body: string }[];
};

/**
 * The conversation in the reservation panel (Z46, design v1.3 `Spravy`): the guest on the left, the team on the
 * right in the accent, automatic messages light green with "Automaticky · …"; the scheduled one dashed with
 * "Upraviť pre tohto hosťa" / "Neposielať"; a reply with quick replies. Opening it marks it read for the team.
 */
export function ConversationPane(props: Props) {
  const t = useTranslations("modules.messages.admin");
  const tf = useTranslations("forms");
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const menuId = useId();
  const first = props.guestName.trim().split(/\s+/)[0] ?? "";

  useEffect(() => {
    void markConversationRead(props.reservationId);
  }, [props.reservationId]);

  const day = (iso: string) => {
    const f = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: props.timeZone }).format(d);
    const d = f(new Date(iso));
    if (d === props.today) return t("today");
    if (d === props.yesterday) return t("yesterday");
    return new Intl.DateTimeFormat(props.locale, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      timeZone: props.timeZone,
    }).format(new Date(iso));
  };
  const time = (iso: string) =>
    new Intl.DateTimeFormat(props.locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: props.timeZone,
    }).format(new Date(iso));
  const dateTime = (iso: string) =>
    new Intl.DateTimeFormat(props.locale, {
      day: "numeric",
      month: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: props.timeZone,
    }).format(new Date(iso));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) after?.();
      else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
    });

  return (
    <div className="grid min-w-0 gap-4">
      <ol className="flex flex-col gap-3" aria-label={t("thread")}>
        {props.messages.length === 0 && props.scheduled.length === 0 ? (
          <li className="text-muted-foreground py-6 text-center text-sm">{t("empty")}</li>
        ) : null}
        {props.messages.map((m, i) => {
          const d = day(m.createdAt);
          const sep = i === 0 || d !== day(props.messages[i - 1]!.createdAt);
          const ours = m.sender !== "guest";
          return (
            <li key={m.id} className="contents">
              {sep ? (
                <span className="self-center font-mono text-[11px] tracking-[0.1em] text-[#6b7480] uppercase">
                  {d}
                </span>
              ) : null}
              <div
                className={cn(
                  "flex max-w-[82%] flex-col gap-1",
                  ours ? "items-end self-end" : "items-start self-start",
                )}
              >
                {m.sender === "auto" && m.rule ? (
                  <span className="text-xs font-medium text-[#2f5d50]">
                    {t("autoLabel", { when: ruleWhen(t, m.rule, false) })}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line",
                    m.sender === "guest" &&
                      "rounded-bl-sm border-[#e9e5db] bg-white text-[#11212f]",
                    m.sender === "staff" &&
                      "bg-primary border-primary text-primary-foreground rounded-br-sm",
                    m.sender === "auto" &&
                      "rounded-br-sm border-[#dbe5df] bg-[#e9efec] text-[#11212f]",
                  )}
                >
                  {m.body}
                </div>
                <span className="text-xs text-[#6b7480]">
                  {ours
                    ? [time(m.createdAt), m.author, m.readByGuest ? t("read") : null]
                        .filter(Boolean)
                        .join(" · ")
                    : `${first} · ${time(m.createdAt)}`}
                </span>
              </div>
            </li>
          );
        })}
        {props.scheduled.map((s) =>
          s.skipped ? (
            <li key={s.ruleId} className="self-center text-center text-[13px] text-[#5a6672]">
              {t("skippedNote", { name: s.name })}{" "}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => setScheduledOverride(props.reservationId, s.ruleId, false, null))
                }
                className="text-ink font-medium underline underline-offset-[3px]"
              >
                {t("unskip")}
              </button>
            </li>
          ) : (
            <Scheduled
              key={s.ruleId}
              s={s}
              label={t("plannedLabel", {
                when: dateTime(s.sendAt),
                rule: ruleWhen(t, s, false),
              })}
              pending={pending}
              onSave={(body) =>
                run(() => setScheduledOverride(props.reservationId, s.ruleId, false, body))
              }
              onSkip={() =>
                run(() => setScheduledOverride(props.reservationId, s.ruleId, true, null))
              }
            />
          ),
        )}
      </ol>

      <div className="relative grid gap-2">
        {menu ? (
          <div
            id={menuId}
            role="menu"
            aria-label={t("quickReplies")}
            className="border-line absolute bottom-full left-0 z-10 mb-2 grid max-h-72 w-full max-w-md gap-1 overflow-y-auto rounded-xl border bg-white p-2 shadow-lg"
          >
            {props.quickReplies.map((q) => (
              <button
                key={q.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setDraft((d) => (d ? `${d} ${q.body}` : q.body));
                  setMenu(false);
                  area.current?.focus();
                }}
                className="grid gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-[#f4f3ef]"
              >
                <span className="text-ink text-sm font-medium">{q.title}</span>
                <span className="truncate text-xs text-[#5a6672]">{q.body}</span>
              </button>
            ))}
            <Link
              href="/admin/messages/auto#rychle-odpovede"
              className="text-ink px-3 py-2 text-[13px] font-medium underline underline-offset-[3px]"
            >
              {t("editQuick")}
            </Link>
          </div>
        ) : null}
        <div className="border-line focus-within:border-ink flex items-end gap-2 rounded-xl border bg-white p-2">
          <textarea
            ref={area}
            rows={2}
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t("replyLabel")}
            placeholder={t("replyPlaceholder")}
            className="min-h-[52px] flex-1 resize-y border-0 bg-transparent px-2 py-1.5 text-[15px] outline-none"
          />
          <button
            type="button"
            disabled={pending || !draft.trim()}
            onClick={() =>
              run(
                () => sendStaffMessage(props.reservationId, draft),
                () => setDraft(""),
              )
            }
            className="bg-primary text-primary-foreground min-h-11 rounded-full px-5 text-sm font-bold disabled:opacity-45"
          >
            {t("send")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {props.quickReplies.length ? (
            <button
              type="button"
              aria-expanded={menu}
              aria-controls={menuId}
              onClick={() => setMenu((m) => !m)}
              className="text-ink inline-flex items-center gap-1 text-sm font-medium"
            >
              {t("quickReplies")} <ChevronDown className="size-4" />
            </button>
          ) : null}
          <span className="text-xs text-[#6b7480]">{t("replyHint")}</span>
        </div>
      </div>
    </div>
  );
}

function Scheduled({
  s,
  label,
  pending,
  onSave,
  onSkip,
}: {
  s: ScheduledMessage;
  label: string;
  pending: boolean;
  onSave: (body: string) => void;
  onSkip: () => void;
}) {
  const t = useTranslations("modules.messages.admin");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(s.body);
  return (
    <li className="flex max-w-[82%] flex-col items-end gap-1 self-end">
      <span className="text-xs font-medium text-[#5a6672]">
        {label}
        {s.changed ? ` · ${t("changed")}` : ""}
      </span>
      {editing ? (
        <div className="grid w-full min-w-[260px] gap-2">
          <textarea
            rows={4}
            maxLength={4000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t("editForGuest")}
            className="border-line rounded-xl border bg-white px-3 py-2 text-[15px]"
          />
          <span className="flex justify-end gap-3 text-sm">
            <button type="button" onClick={() => setEditing(false)} className="text-ink">
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={pending || !text.trim()}
              onClick={() => {
                onSave(text);
                setEditing(false);
              }}
              className="text-ink font-bold underline underline-offset-[3px]"
            >
              {t("save")}
            </button>
          </span>
        </div>
      ) : (
        <div className="rounded-2xl rounded-br-sm border border-dashed border-[#b9c8bf] bg-white px-4 py-3 text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line text-[#3b3d42]">
          {s.body}
        </div>
      )}
      {!editing ? (
        <span className="flex gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-ink font-medium underline underline-offset-[3px]"
          >
            {t("editForGuest")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSkip}
            className="font-medium text-[#a04a1f] underline underline-offset-[3px]"
          >
            {t("skip")}
          </button>
        </span>
      ) : null}
    </li>
  );
}
