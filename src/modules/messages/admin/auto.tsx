"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PanelSection, SidePanel } from "@/core/admin/record-panel";
import { fillMessagePreview } from "@/core/email/layout";
import { fillMessageText, type MessageAnchor } from "../rules";
import {
  deleteQuickReply,
  orderQuickReplies,
  saveQuickReply,
  saveRule,
  sendRuleTest,
  toggleRule,
} from "./actions";
import { rulePhase, ruleWhen } from "./when";

export type AutoRule = {
  id: string;
  name: string;
  body: string;
  anchor: MessageAnchor;
  offsetDays: number;
  sendTime: string | null;
  enabled: boolean;
};

type Quick = { id: string; title: string; body: string };

type Props = {
  locale: string;
  rules: AutoRule[];
  quickReplies: Quick[];
  /** Days before the arrival the instructions e-mail goes (tenant settings). */
  arrivalDays: number;
  /** Days before the arrival an upsell offer goes; empty without the module. */
  upsellDays: number[];
  reviewsOn: boolean;
  /** Sample of the preview: the signature of the client and a stay. */
  sample: { signature: string; checkIn: string; checkOut: string; reviewLink: string };
  /** The e-mail as the guest gets it, with BODY_MARKER for the text (Z60) — the preview fills it in. */
  emailTemplate: string;
};

type Rel = "confirmed" | "beforeIn" | "afterIn" | "beforeOut" | "afterOut";

const VARS = [
  ["{meno}", "meno"],
  ["{príchod}", "prichod"],
  ["{odchod}", "odchod"],
  ["{podpis}", "podpis"],
  ["{odkaz na hodnotenie}", "hodnotenie"],
] as const;

function relOf(r: { anchor: MessageAnchor; offsetDays: number }): Rel {
  if (r.anchor === "confirmed") return "confirmed";
  if (r.anchor === "check_in") return r.offsetDays < 0 ? "beforeIn" : "afterIn";
  return r.offsetDays < 0 ? "beforeOut" : "afterOut";
}

function fromRel(rel: Rel, count: number): { anchor: MessageAnchor; offsetDays: number } {
  if (rel === "confirmed") return { anchor: "confirmed", offsetDays: count };
  const anchor = rel === "beforeIn" || rel === "afterIn" ? "check_in" : "check_out";
  return { anchor, offsetDays: rel.startsWith("before") ? -count : count };
}

/**
 * Správy › Automatické správy (Z46, design v1.3 `SpravyAuto`): the stay as a timeline of phases with the rules, a
 * switch for each and "Upraviť" (side panel: when, text with variables, preview, a warning when it would go inside
 * another e-mail, test to oneself); below the quick replies of the conversation.
 */
export function AutoMessages(props: Props) {
  const t = useTranslations("modules.messages.admin");
  const tf = useTranslations("forms");
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const rule = props.rules.find((r) => r.id === editing) ?? null;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) after?.();
      else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
    });

  const sorted = [...props.rules].sort(
    (a, b) =>
      rulePhase(a) - rulePhase(b) ||
      a.offsetDays - b.offsetDays ||
      (a.sendTime ?? "").localeCompare(b.sendTime ?? ""),
  );
  const phases = [0, 1, 2, 3, 4]
    .map((p) => ({ p, rules: sorted.filter((r) => rulePhase(r) === p) }))
    .filter((g) => g.rules.length);

  return (
    <div className="grid gap-12">
      <ol className="grid gap-8" aria-label={t("auto.title")}>
        {phases.map((g) => (
          <li key={g.p} className="grid gap-3">
            <h2 className="label-mono">{t(`auto.phases.${g.p}` as "auto.phases.0")}</h2>
            <ul className="border-line grid border-t">
              {g.rules.map((r) => (
                <li
                  key={r.id}
                  className="border-line grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 border-b px-2 py-4"
                >
                  <div className="grid min-w-0 gap-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span
                        className={
                          r.enabled
                            ? "text-ink text-[15px] font-bold"
                            : "text-[15px] font-bold text-[#5a6672]"
                        }
                      >
                        {r.name}
                      </span>
                      <span className="text-[13px] text-[#5a6672]">{ruleWhen(t, r)}</span>
                    </span>
                    <span className="line-clamp-2 text-[13px] text-[#5a6672]">{r.body}</span>
                    {r.anchor === "confirmed" && r.offsetDays === 0 ? (
                      <span className="text-xs text-[#2f5d50]">{t("auto.inConfirmation")}</span>
                    ) : null}
                    {props.reviewsOn && r.body.includes("{odkaz na hodnotenie}") ? (
                      <span className="text-xs text-[#2f5d50]">{t("auto.reviewNote")}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(r.id)}
                      aria-label={`${t("auto.edit")}: ${r.name}`}
                      className="text-ink min-h-10 text-sm font-medium underline underline-offset-[3px]"
                    >
                      {t("auto.edit")}
                    </button>
                    <Switch
                      checked={r.enabled}
                      disabled={pending}
                      aria-label={t(r.enabled ? "auto.switchOff" : "auto.switchOn", {
                        name: r.name,
                      })}
                      onCheckedChange={(v) => run(() => toggleRule(r.id, v))}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <QuickReplies items={props.quickReplies} />

      <SidePanel
        open={rule !== null}
        onClose={() => setEditing(null)}
        header={
          <span className="font-mono text-[13px] text-[#5a6672]">{t("auto.panelKicker")}</span>
        }
        title={rule?.name}
        label={rule?.name ?? t("auto.panelKicker")}
        backLabel={t("auto.title")}
      >
        {rule ? (
          <RuleEditor key={rule.id} rule={rule} {...props} onDone={() => setEditing(null)} />
        ) : null}
      </SidePanel>
    </div>
  );
}

function RuleEditor({
  rule,
  locale,
  arrivalDays,
  upsellDays,
  reviewsOn,
  sample,
  emailTemplate,
  onDone,
}: Props & { rule: AutoRule; onDone: () => void }) {
  const t = useTranslations("modules.messages.admin");
  const tf = useTranslations("forms");
  const [pending, start] = useTransition();
  const [name, setName] = useState(rule.name);
  const [rel, setRel] = useState<Rel>(relOf(rule));
  const [count, setCount] = useState(Math.abs(rule.offsetDays));
  const [time, setTime] = useState((rule.sendTime ?? "10:00").slice(0, 5));
  const [body, setBody] = useState(rule.body);
  const area = useRef<HTMLTextAreaElement>(null);
  const when = fromRel(rel, count);
  const sampleGuest = t("auto.sampleGuest");
  const preview = fillMessageText(body, {
    guestName: sampleGuest,
    checkIn: sample.checkIn,
    checkOut: sample.checkOut,
    signature: sample.signature,
    reviewLink: sample.reviewLink,
  });
  const dates = `${fmt(sample.checkIn)} – ${fmt(sample.checkOut)}`;
  const collision =
    when.anchor === "check_in" && when.offsetDays === -arrivalDays
      ? t("auto.collisionArrival")
      : when.anchor === "check_in" && upsellDays.includes(-when.offsetDays)
        ? t("auto.collisionUpsell")
        : null;

  const insert = (v: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    setBody(body.slice(0, at) + v + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + v.length, at + v.length);
    });
  };

  const save = () =>
    start(async () => {
      const r = await saveRule({
        id: rule.id,
        name,
        anchor: when.anchor,
        offsetDays: when.offsetDays,
        sendTime: when.anchor === "confirmed" ? null : time,
        body,
        locale,
      });
      if (r.ok) {
        toast.success(t("auto.saved"));
        onDone();
      } else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
    });
  const test = () =>
    start(async () => {
      const r = await sendRuleTest(t("auto.testSubject", { name }), preview, {
        guestName: sampleGuest,
        checkIn: sample.checkIn,
        checkOut: sample.checkOut,
      });
      if (r.ok) toast.success(t("auto.testSent"));
      else toast.error(tf("errors.generic"));
    });

  const field =
    "border-line focus:border-ink min-h-11 rounded-xl border bg-white px-3 text-[15px] outline-none";
  return (
    <div className="grid gap-7 pb-4">
      <label className="grid gap-1.5">
        <span className="label-mono">{t("auto.name")}</span>
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </label>

      <PanelSection label={t("auto.whenTitle")}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-[#5a6672]">{t("auto.count")}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={count}
              onChange={(e) => setCount(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              className={`${field} w-24`}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[#5a6672]">{t("auto.relative")}</span>
            <select
              value={rel}
              onChange={(e) => setRel(e.target.value as Rel)}
              className={`${field} pr-8`}
            >
              {(["confirmed", "beforeIn", "afterIn", "beforeOut", "afterOut"] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`auto.rel.${r}`)}
                </option>
              ))}
            </select>
          </label>
          {when.anchor !== "confirmed" ? (
            <label className="grid gap-1">
              <span className="text-xs text-[#5a6672]">{t("auto.time")}</span>
              <input
                type="time"
                value={time}
                step={900}
                onChange={(e) => setTime(e.target.value)}
                className={field}
              />
            </label>
          ) : null}
        </div>
        <p className="text-ink text-sm font-medium">{ruleWhen(t, { ...when, sendTime: time })}</p>
        {collision ? (
          <p role="note" className="rounded-xl bg-[#f4efe4] px-3 py-2 text-[13px] text-[#6b4e14]">
            {collision}
          </p>
        ) : null}
        <p className="text-xs text-[#5a6672]">{t("auto.passedNote")}</p>
      </PanelSection>

      <PanelSection
        label={t("auto.text")}
        aside={<span className="text-xs text-[#5a6672]">{t("auto.textLang")}</span>}
      >
        <textarea
          ref={area}
          rows={7}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label={t("auto.text")}
          className="border-line focus:border-ink rounded-xl border bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#5a6672]">{t("auto.insert")}</span>
          {VARS.filter(([, k]) => k !== "hodnotenie" || reviewsOn).map(([v, k]) => (
            <button
              key={v}
              type="button"
              onClick={() => insert(v)}
              className="border-line text-ink hover:bg-muted min-h-8 rounded-full border px-3 text-xs font-medium"
            >
              {t(`auto.vars.${k}`)}
            </button>
          ))}
        </div>
        <Link
          href="/admin/settings#kontakt"
          className="justify-self-start text-xs text-[#5a6672] underline underline-offset-[3px] hover:text-[#11212f]"
        >
          {t("auto.signatureNote")}
        </Link>
      </PanelSection>

      {/* The whole e-mail as the guest gets it — the client's header and footer (Z60); the same as the test e-mail. */}
      <PanelSection label={t("auto.preview", { guest: sampleGuest, dates })}>
        <iframe
          title={t("auto.preview", { guest: sampleGuest, dates })}
          sandbox=""
          srcDoc={fillMessagePreview(emailTemplate, preview)}
          className="border-line h-[560px] w-full rounded-xl border bg-[#f6f5f1]"
        />
      </PanelSection>

      <p className="text-xs text-[#5a6672]">{t("auto.appliesNote")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending || !name.trim() || !body.trim()}
          onClick={save}
          className="bg-primary text-primary-foreground min-h-11 rounded-full px-6 text-sm font-bold disabled:opacity-45"
        >
          {t("save")}
        </button>
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={test}
          className="text-ink min-h-11 text-sm font-medium underline underline-offset-[3px]"
        >
          {t("auto.test")}
        </button>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

/** Quick replies of the conversation: add, change, order, delete. */
function QuickReplies({ items }: { items: Quick[] }) {
  const t = useTranslations("modules.messages.admin");
  const tf = useTranslations("forms");
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) after?.();
      else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
    });
  const move = (i: number, by: number) => {
    const ids = items.map((q) => q.id);
    const [id] = ids.splice(i, 1);
    ids.splice(i + by, 0, id!);
    run(() => orderQuickReplies(ids));
  };

  return (
    <section id="rychle-odpovede" className="grid scroll-mt-24 gap-3" aria-labelledby="quick-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="quick-title" className="text-ink text-xl font-extrabold tracking-[-0.02em]">
          {t("auto.quickTitle")}
        </h2>
        {editing !== "new" ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="text-ink text-sm font-medium underline underline-offset-[3px]"
          >
            {t("auto.addQuick")}
          </button>
        ) : null}
      </div>
      <p className="text-muted-foreground max-w-prose text-sm">{t("auto.quickLead")}</p>
      <ul className="border-line grid border-t">
        {items.map((q, i) =>
          editing === q.id ? (
            <li key={q.id} className="border-line border-b px-2 py-4">
              <QuickForm
                initial={q}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(v) =>
                  run(
                    () => saveQuickReply({ id: q.id, ...v }),
                    () => setEditing(null),
                  )
                }
              />
            </li>
          ) : (
            <li
              key={q.id}
              className="border-line grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-b px-2 py-3.5"
            >
              <span className="grid min-w-0 gap-0.5">
                <span className="text-ink text-[15px] font-bold">{q.title}</span>
                <span className="line-clamp-2 text-[13px] text-[#5a6672]">{q.body}</span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`${t("auto.up")}: ${q.title}`}
                  className="text-ink hover:bg-muted inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pending || i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`${t("auto.down")}: ${q.title}`}
                  className="text-ink hover:bg-muted inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(q.id)}
                  aria-label={`${t("auto.edit")}: ${q.title}`}
                  className="text-ink min-h-10 px-2 text-sm font-medium underline underline-offset-[3px]"
                >
                  {t("auto.edit")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteQuickReply(q.id))}
                  aria-label={`${t("auto.delete")}: ${q.title}`}
                  className="min-h-10 px-2 text-sm font-medium text-[#a04a1f] underline underline-offset-[3px]"
                >
                  {t("auto.delete")}
                </button>
              </span>
            </li>
          ),
        )}
        {editing === "new" ? (
          <li className="border-line border-b px-2 py-4">
            <QuickForm
              initial={{ title: "", body: "" }}
              pending={pending}
              onCancel={() => setEditing(null)}
              onSave={(v) =>
                run(
                  () => saveQuickReply({ id: null, ...v }),
                  () => setEditing(null),
                )
              }
            />
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function QuickForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial: { title: string; body: string };
  pending: boolean;
  onCancel: () => void;
  onSave: (v: { title: string; body: string }) => void;
}) {
  const t = useTranslations("modules.messages.admin");
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  return (
    <div className="grid max-w-2xl gap-3">
      <label className="grid gap-1">
        <span className="text-xs text-[#5a6672]">{t("auto.quickName")}</span>
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="border-line focus:border-ink min-h-11 rounded-xl border bg-white px-3 text-[15px] outline-none"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-[#5a6672]">{t("auto.quickText")}</span>
        <textarea
          rows={3}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="border-line focus:border-ink rounded-xl border bg-white px-3 py-2 text-[15px] outline-none"
        />
      </label>
      <span className="flex gap-4 text-sm">
        <button
          type="button"
          disabled={pending || !title.trim() || !body.trim()}
          onClick={() => onSave({ title, body })}
          className="bg-primary text-primary-foreground min-h-10 rounded-full px-5 font-bold disabled:opacity-45"
        >
          {t("save")}
        </button>
        <button type="button" onClick={onCancel} className="text-ink">
          {t("cancel")}
        </button>
      </span>
    </div>
  );
}
